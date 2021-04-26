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
    files: [] // FileInfo { file, metaData }
  },  
  getters: {
    filesNotEmpty(state) {
      return state.files.length > 0 ? true: false
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
        if (fileInfo.file.size === 350) {
          // Probably a Single Patch file       
          context.dispatch('processHeaderOfSinglePatchFile', fileInfo.file)
            .then((result) => {
              console.log('Single Patch File processed:', fileInfo.file.name, 'Meta:', result)
              context.commit('setMetaData', { fileInfo, metaData: result })
            })
        } else if (fileInfo.file.size === 22400) {
          // Probably a Patch Pack file
        } else {
          // error
        }
      }
    },
    processHeaderOfSinglePatchFile: async function (context, file) {
      let metaData = {
        product: '',
        patchName: '',
        patchCategory: '',
        patchGenre: '',
        fileType: 'Single Patch file',
        error: null
      }

      try {
        let fileBuffer = await file.arrayBuffer();
        let patchData = new Uint8Array(fileBuffer);

        // Check if this is SysEx file
        if (patchData[0] != 0xf0 || patchData[patchData.length - 1] != 0xf7) {
          metaData.error = new Error("Not a SysEx file format");
        }

        // Check Manufacturer ID
        if (
          patchData[1] != 0x00 ||
          patchData[2] != 0x20 ||
          patchData[3] != 0x29
        ) {
          metaData.error = new Error("Not Novation SysEx file format");
        }

        // Check Product ID
        if (patchData[4] == 0x01 && patchData[5] == 0x60) {
          // OG Circuit
          metaData.product = "Circuit"
        } else if (patchData[4] == 0x01 && patchData[5] == 0x64) {
          // Circuit Tracks
          metaData.product = "Circuit Tracks"
        } else {
          metaData.error = new Error("Not an Original Circuit or Circuit Tracks patch");
        }

        // Patch name
        let patchName = patchData
          .subarray(9, 25)
          .reduce(
            (str, currentValue) => str + String.fromCharCode(currentValue),
            ""
          );

        metaData.patchName = patchName.trim()

        // Category
        if (patchData[25] > category.length - 1) {
          console.warn("Category is not found");
        } else {
          metaData.patchCategory = category[patchData[25]]
        }

        // Genre
        if (patchData[26] > genre.length - 1) {
          console.warn("Genre is not found");
        } else {
          metaData.patchGenre = genre[patchData[26]]
        }

        return metaData;
      } catch (e) {
        metaData.error = new Error("Error loading file content. " + e)
      }
    },
  }
})