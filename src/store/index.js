import Vue from 'vue'
import Vuex from 'vuex'
import sanitize from '../plugins/sanitize-filename'

Vue.use(Vuex)

const category = Object.freeze([
  "None",
  "Arp",
  "Bass",
  "Bell",
  "Classic",
  "Drum",
  "Keyboard",
  "Lead",
  "Movement",
  "Pad",
  "Poly",
  "SFX",
  "Strings",
  "User",
  "Voc/Tune",
])

const genre = Object.freeze([
  "None",
  "Classic",
  "DnB Breaks",
  "House",
  "Industrial",
  "Jazz",
  "RnB/HipHop",
  "Rock/Pop",
  "Techno",
  "Dubstep",
])

export default new Vuex.Store({
  state: {
    files: [], // FileInfo { file, metaData }
    downloadInProcess: false
  },
  getters: {
    filesNotEmpty(state) {
      return state.files.length > 0 ? true : false
    }
  },
  mutations: {
    clearFiles(state) {
      state.files.splice(0, state.files.length)
    },
    removeFiles(state, args) {
      if (!args ||
        args.start === undefined ||
        args.deleteCount === undefined) {
        console.error('Invalid arguments for "removeFiles" store mutation', args)
        return
      }

      state.files.splice(args.start, args.deleteCount)
    },
    addFile(state, file) {
      if (!file) {
        console.error('Invalid argument for "addFile" store mutation', file)
        return
      }

      state.files.push({ file, metaData: null })
    },
    setMetaData(state, args) {
      if (!args ||
        !args.fileInfo ||
        !args.metaData) {
        console.error('Invalid arguments for "setMetaData" store mutation', args)
        return
      }

      let fileIndex = state.files.indexOf(args.fileInfo)
      if (fileIndex != -1) {
        state.files[fileIndex].metaData = args.metaData
      }
    },
    setDownloadProcess(state, inProcess) {
      state.downloadInProcess = inProcess
    }
  },
  actions: {
    processFiles: function (context) {
      for (let fileInfo of context.state.files) {
        if (fileInfo.metaData) { continue } // skip already processed files     
        context.dispatch('processFileHeader', fileInfo.file)
          .then((result) => {
            console.log('File processed:', fileInfo.file.name, 'Meta:', result)
            context.commit('setMetaData', { fileInfo, metaData: result })
          })
      }
    },
    processFileHeader: async function (context, file) {
      let metaData = {
        product: '',
        fileType: '',
        patches: [],
        converted: false,
        error: null
      }

      let patchData = null

      try {
        const fileBuffer = await file.arrayBuffer();
        patchData = new Uint8Array(fileBuffer);
      } catch (e) {
        metaData.error = new Error("Error loading file content. " + e)
        return metaData
      }

      const readSinglePatchHeader = (singlePatchData) => {
        let patchInfo = {
          product: '',
          name: '',
          category: '',
          genre: '',
          data: singlePatchData,
          error: null          
        }

        // Check if this is SysEx file
        if (singlePatchData[0] != 0xf0 || singlePatchData[singlePatchData.length - 1] != 0xf7) {
          patchInfo.error = new Error("Not a SysEx file format");
          return patchInfo
        }

        // Check Manufacturer ID
        if (
          singlePatchData[1] != 0x00 ||
          singlePatchData[2] != 0x20 ||
          singlePatchData[3] != 0x29
        ) {
          patchInfo.error = new Error("Not Novation SysEx file format");
          return patchInfo
        }

        // Check Product ID
        if (singlePatchData[4] == 0x01 && singlePatchData[5] == 0x60) {
          // OG Circuit
          patchInfo.product = "Circuit"
        } else if (singlePatchData[4] == 0x01 && singlePatchData[5] == 0x64) {
          // Circuit Tracks
          patchInfo.product = "Circuit Tracks"
        } else {
          patchInfo.error = new Error("Not an Original Circuit or Circuit Tracks patch");
          return patchInfo
        }

        // Patch name
        let patchName = singlePatchData
          .subarray(9, 25)
          .reduce(
            (str, currentValue) => str + String.fromCharCode(currentValue),
            ""
          );

        patchInfo.name = patchName.trim()

        // Category
        if (singlePatchData[25] > category.length - 1) {
          console.warn("Category is not found");
        } else {
          patchInfo.category = category[singlePatchData[25]]
        }

        // Genre
        if (singlePatchData[26] > genre.length - 1) {
          console.warn("Genre is not found");
        } else {
          patchInfo.genre = genre[singlePatchData[26]]
        }

        return patchInfo
      }

      switch (file.size) {
        case 350: {
          let patchInfo = readSinglePatchHeader(patchData)
          metaData.fileType = 'Single Patch'          
          metaData.product = patchInfo.product
          metaData.error = patchInfo.error
          metaData.patches.push(patchInfo)
          break
        }
        case 22400: {
          metaData.fileType = 'Patch Pack'
          for (let patchIndex = 0; patchIndex < 64; patchIndex++) {
            const offsetBytes = 350 * patchIndex
            let singlePatchData = patchData.slice(offsetBytes, offsetBytes + 350)
            let patchInfo = readSinglePatchHeader(singlePatchData)
            metaData.patches.push(patchInfo)
          }

          if (metaData.patches.length > 0) {
            metaData.product = metaData.patches[0].product
          }
          break
        }
        default: {
          metaData.error = new Error('File type is not supported')
          return metaData
        }
      }
      
      return metaData;
    },    
    convertAndDownloadFiles: async function (context) {
      const downloadURL = (data, fileName) => {  
        // https://stackoverflow.com/questions/25354313/saving-a-uint8array-to-a-binary-file/62176999#62176999
        const a = document.createElement("a");
        a.href = data;
        a.download = fileName;
        document.body.appendChild(a);
        a.style.display = "none";
        a.click();
        a.remove();
      }

      const downloadFile = (data, fileName, mimeType) => {
        const blob = new Blob([data], {
          type: mimeType,
        });
  
        const url = window.URL.createObjectURL(blob);
        downloadURL(url, fileName);
        setTimeout(() => window.URL.revokeObjectURL(url), 1000);
      }

      // https://stackoverflow.com/questions/53560991/automatic-file-downloads-limited-to-10-files-on-chrome-browser
      const pause = (msec) => {
        return new Promise(
          (resolve, reject) => {
            setTimeout(resolve, msec || 1000);
          }
        );
      }

      context.commit('setDownloadProcess', true)

      let count = 0
      for (let fileInfo of context.state.files) {
        if (fileInfo.metaData.error || fileInfo.metaData.converted) { continue } // skip all already converted files and files with errors
        for (let patchInfo of fileInfo.metaData.patches) {
          if (patchInfo.error) { continue } // skip all patches with errors
          let convertedPatchData = patchInfo.data.slice() // clone subarray
          // Swapping product ID
          convertedPatchData[5] = convertedPatchData[5] === 0x60 ? 0x64 : 0x60
          let convertedProductID = patchInfo.product === 'Circuit' ? 'CircuitTracks' : 'Circuit'
          let convertedFileName = sanitize(patchInfo.name) + '.' + convertedProductID + '.SinglePatch.syx'
          console.log('Patch converted:', convertedFileName)
          downloadFile(convertedPatchData, convertedFileName, "application/octet-stream");
          if (++count >= 10) {
            console.log('Pause for 1 second')
            await pause(1000)
            count = 0
          }
        }

        fileInfo.metaData.converted = true
      }

      context.commit('setDownloadProcess', false)
    },
  }
})