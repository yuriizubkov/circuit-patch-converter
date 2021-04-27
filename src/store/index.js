import Vue from 'vue'
import Vuex from 'vuex'

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
    appendFileTypeSuffix: true
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
    }
  },
  actions: {
    processFiles: function (context) {
      for (let fileInfo of context.state.files) {
        if (fileInfo.file.metaData) { continue } // skip already processed files     
        context.dispatch('processFileHeader', fileInfo.file)
          .then((result) => {
            console.log('Single Patch File processed:', fileInfo.file.name, 'Meta:', result)
            context.commit('setMetaData', { fileInfo, metaData: result })
          })
      }
    },
    processFileHeader: async function (context, file) {
      let metaData = {
        product: '',
        fileType: '',
        patches: [],
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

      const readSinglePatchHeader = (patchData) => {
        let patchInfo = {
          product: '',
          name: '',
          category: '',
          genre: '',
          error: null
        }

        // Check if this is SysEx file
        if (patchData[0] != 0xf0 || patchData[patchData.length - 1] != 0xf7) {
          patchInfo.error = new Error("Not a SysEx file format");
          return patchInfo
        }

        // Check Manufacturer ID
        if (
          patchData[1] != 0x00 ||
          patchData[2] != 0x20 ||
          patchData[3] != 0x29
        ) {
          patchInfo.error = new Error("Not Novation SysEx file format");
          return patchInfo
        }

        // Check Product ID
        if (patchData[4] == 0x01 && patchData[5] == 0x60) {
          // OG Circuit
          patchInfo.product = "Circuit"
        } else if (patchData[4] == 0x01 && patchData[5] == 0x64) {
          // Circuit Tracks
          patchInfo.product = "Circuit Tracks"
        } else {
          patchInfo.error = new Error("Not an Original Circuit or Circuit Tracks patch");
          return patchInfo
        }

        // Patch name
        let patchName = patchData
          .subarray(9, 25)
          .reduce(
            (str, currentValue) => str + String.fromCharCode(currentValue),
            ""
          );

        patchInfo.name = patchName.trim()

        // Category
        if (patchData[25] > category.length - 1) {
          console.warn("Category is not found");
        } else {
          patchInfo.category = category[patchData[25]]
        }

        // Genre
        if (patchData[26] > genre.length - 1) {
          console.warn("Genre is not found");
        } else {
          patchInfo.genre = genre[patchData[26]]
        }

        return patchInfo
      }

      let patchInfo = null
      switch (file.size) {
        case 350:
          patchInfo = readSinglePatchHeader(patchData)
          metaData.fileType = 'Single Patch'          
          metaData.product = patchInfo.product
          metaData.error = patchInfo.error
          metaData.patches.push(patchInfo)
          break
        case 22400:
          metaData.fileType = 'Patch Pack'
          for (let patchIndex = 0; patchIndex < 64; patchIndex++) {
            const offsetBytes = 350 * patchIndex
            let singlePatchData = patchData.subarray(offsetBytes, 350 * (offsetBytes + 1))
            patchInfo = readSinglePatchHeader(singlePatchData)
            metaData.patches.push(patchInfo)
          }

          if (metaData.patches.length > 0) {
            metaData.product = metaData.patches[0].product
          }
          break
        default:
          metaData.error = new Error('File type is not supported')
          return metaData
      }
      
      return metaData;
    },
    downloadURL: function (context, args) {
      if (!args ||
        !args.data ||
        !args.fileName) {
        console.error('Invalid arguments for "downloadURL" store action', args)
        return
      }

      // https://stackoverflow.com/questions/25354313/saving-a-uint8array-to-a-binary-file/62176999#62176999
      const a = document.createElement("a");
      a.href = args.data;
      a.download = args.fileName;
      document.body.appendChild(a);
      a.style.display = "none";
      a.click();
      a.remove();
    },
    downloadFile: function (context, args) {
      if (!args ||
        !args.data ||
        !args.fileName ||
        !args.mimeType) {
        console.error('Invalid arguments for "downloadFile" store action', args)
        return
      }

      const blob = new Blob([args.data], {
        type: args.mimeType,
      });

      const url = window.URL.createObjectURL(blob);
      this.downloadURL(url, args.fileName);
      setTimeout(() => window.URL.revokeObjectURL(url), 1000);
    },
    convertAndDownloadFiles: function (context) {
      for (let fileInfo of context.state.files) {
        let fileName = fileInfo.file.name
        let lastIndex = fileInfo.file.name.lastIndexOf('.')

        if (lastIndex !== -1) {
          fileName = fileInfo.file.name.substr(0, lastIndex)
        }

        let convertedFileName = fileName + '.' +
          fileInfo.metaData.product.replace(' ', '') + '.' +
          fileInfo.metaData.fileType.replace(' ', '') + '.syx'

        console.log(convertedFileName)
        //this.downloadFile(file, "MyCoolPatch.syx", "application/octet-stream");
      }
    },
  }
})