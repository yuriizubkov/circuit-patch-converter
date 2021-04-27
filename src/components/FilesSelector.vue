<template>
  <!-- Based on Drop box https://gist.github.com/sploders101/f1a3bb46ed4b8a5897d2153a846addc9#gistcomment-3488682 -->
  <!-- But modified to work with Vuex Store -->
  <div
    class="dropzone"
    @dragover.prevent
    @dragleave="dragleave"
    @dragenter="dragenter"
    @drop="drop"
    ref="dropzone"
  >
    <!-- Box Label -->
    <slot v-if="!disableLabel"><h1>{{ label || "Upload Box" }}</h1></slot
    >
    <!-- Upload Button -->
    <v-btn @click="$refs.filebtn.click()">
      <v-icon left dark>mdi-harddisk</v-icon>
      Select files
    </v-btn>
    <!-- Indicate files can be dropped in here -->
    <p v-if="!disableHint">
      *You can select Single Patches and Patch Packs (not Circuit Packs).<br/>
      All files will be saved as separate patches.
    </p>
    <!-- Indicate selected files -->
    <div class="input-container mt-5">
      <FileCard v-for="file in files" :key="file.name" :fileInfo="file" v-on:remove="remove(file)"/>
    </div>
    <!-- Hidden upload button to bring up file selection dialog -->
    <input
      ref="filebtn"
      class="filebtn"
      type="file"
      :multiple="multiple"
      :accept="
        validatedAccept &&
        [...validatedAccept.extensions, ...validatedAccept.mimetypes].join(',')
      "
      @input="upload"
    />
  </div>
</template>

<script>
import { mapState, mapMutations } from "vuex";
import FileCard from './FileCard'
export default {
  components: { 
    FileCard 
  },
  props: {
    label: {
      type: String,
      required: false,
    },
    accept: {
      type: String,
      required: false,
    },
    multiple: {
      type: Boolean,
      required: false,
    },
    disableLabel: {
      type: Boolean,
      required: false,
    },
    disableHint: {
      type: Boolean,
      required: false,
    },
  },
  data() {
    return {
      hoverCounter: 0,
      hoveringContent: null,
      matchAnything: /.*/,
    };
  },
  computed: {
    filebtn: {
      cache: false,
      get() {
        return this.$refs.filebtn;
      },
    },
    dropzone: {
      cache: false,
      get() {
        return this.$refs.dropzone;
      },
    },
    validTypes() {
      if (this.validatedAccept) {
        return {
          extensions: this.validatedAccept.extensions
            .map((ext) => ext.replace(/(\W)/g, "\\$1")) // Escape all potential regex tokens
            .map((rgxstr) => new RegExp(`${rgxstr}$`, "i")), // Transform into regex to look for extension
          mimetypes: this.validatedAccept.mimetypes
            .map((mt) => mt.replace(/([-+/])/g, "\\$1")) // Escape special characters
            .map((mt) => mt.replace(/\*/g, "(?:[A-Za-z0-9\\-\\+]*)*")) // Enable wildcards
            .map((rgxstr) => new RegExp(`^${rgxstr}$`)), // Transform into regex
        };
      } else {
        // If we haven't been given any filters...
        return {
          extensions: [this.matchAnything],
          mimetypes: [this.matchAnything],
        };
      }
    },
    validatedAccept() {
      if (this.accept) {
        return {
          extensions: this.accept
            .split(",")
            .filter((type) => type.match(/^\.(?!.*\/)/)), // Get only extension filters
          mimetypes: this.accept
            .split(",")
            .filter((type) =>
              type.match(
                /^(?:(?:[A-Za-z0-9\-+]*)|\*)\/(?:(?:[A-Za-z0-9\-+.]*)|\*)$/
              )
            ), // Get only mimetype filters
        };
      } else {
        return null;
      }
    },
    ...mapState(['files'])
  },
  methods: {
    upload() {
      const files = this.filebtn.files ?? [];
      for (let i = 0; i < files.length; i++) {
        if (!this.multiple) {
          this.clearFiles()
        }
        const shouldPush =
          this.validTypes.extensions.reduce(
            (prev, regex) => prev || !!files[i].name.match(regex),
            false
          ) ||
          this.validTypes.mimetypes.reduce(
            (prev, regex) => prev || !!files[i].type.match(regex),
            false
          );
        if (shouldPush) {
          this.addFile(files[i])
        }
      }
      this.filebtn.value = "";
    },
    dragenter(e) {
      this.hoveringContent = e.dataTransfer.items;
      this.hoverCounter++;
    },
    /** Counts leave events (fix for event rippling issues) */
    dragleave(e) {
      this.hoverCounter--;
    },
    /** Validates and keeps track of dropped content */
    drop(e) {
      e.preventDefault(); // Keep from leaving the page
      this.hoverCounter = 0; // Content can't be dragged out, so go ahead and reset the counter
      if (e.dataTransfer.items) {
        const rejected = []; // Keeps track of rejected items for reporting at the end
        for (let i = 0; i < e.dataTransfer.items.length; i++) {
          if (e.dataTransfer.items[i].kind === "file") {
            // Directories are not supported. Skip any that are found
            if (e.dataTransfer.items[i].webkitGetAsEntry) {
              const entry = e.dataTransfer.items[i].webkitGetAsEntry();
              if (entry.isDirectory) {
                rejected.push(entry.name);
                continue;
              }
            }
            const file = e.dataTransfer.items[i].getAsFile();
            if (file) {
              const shouldPush = // Check against Regex arrays from accept property
                this.validTypes.extensions.reduce(
                  (prev, regex) => prev || !!file.name.match(regex),
                  false
                ) ||
                this.validTypes.mimetypes.reduce(
                  (prev, regex) => prev || !!file.type.match(regex),
                  false
                );
              if (shouldPush) {
                if (this.multiple) {
                  // Remove duplicates
                  this.files.map((fileInfo) => fileInfo.file)
                    .filter((currFile) => currFile.name === file.name)
                    .forEach((fileToRemove) =>
                      this.removeFiles({ start: this.files.indexOf(fileToRemove), deleteCount: 1 })
                    );
                } else {
                  // Remove all
                  this.clearFiles()
                }
                this.addFile(file)
              } else {
                rejected.push(file); // Keep track of rejected files
                continue;
              }
            } else {
              continue;
            }
          }
        }
        // Emit rejected files
        if (rejected.length) {
          this.$emit("rejectedFiles", rejected);
        }
      }
    }, 
    /** Removes attachment per user's request */
    remove(file) {
      const arr = this.files;
      this.removeFiles({ start: arr.indexOf(file), deleteCount: 1 })
      this.$emit("update", null);
    },   
    ...mapMutations([
      'removeFiles', 
      'addFile'])
  },
  watch: {
    multiple(val) {
      if (!val) {
        this.removeFiles({ start: 0, deleteCount: this.files.length - 1 })
      }
    },
    hoveringContent(val) {
      // If a file is hovering
      if (val) {
        // If we have type checking and we're using mimetypes only
        if (
          this.accept &&
          this.accept.length &&
          this.validTypes.extensions.length === 0
        ) {
          let shouldDim = false;
          // For each file hovering over the box...
          for (let i = 0; i < val.length; i++) {
            if (
              // Check the type against all our mime types
              this.validTypes.mimetypes.reduce(
                (prev, regex) => prev || !!val[i].type.match(regex)
              )
            ) {
              shouldDim = true;
              break;
            }
          }
          // If we found a match, dim the box
          if (shouldDim) {
            this.dropzone.style.backgroundColor = "rgba(0, 0, 0, 0.25)";
          }
          // If not, we can't definitively typecheck, so...
        } else {
          // Check that we have a file in there
          let shouldDim = false;
          for (let i = 0; i < val.length; i++) {
            if (val[i].kind === "file") {
              shouldDim = true;
              break;
            }
          }
          // ... and dim the box
          if (shouldDim) {
            this.dropzone.style.backgroundColor = "rgba(0, 0, 0, 0.25)";
          }
        }
        // Otherwise...
      } else {
        // Un-dim the box
        this.dropzone.style.backgroundColor = "";
      }
    },
    hoverCounter(val) {
      if (val === 0) {
        this.hoveringContent = null;
      }
    },
  },
};
</script>

<style lang="scss" scoped>
h1 {
  font-size: 1.5em;
  font-weight: 400;
  font-family: Roboto, sans-serif;
  color: hsla(0, 0%, 100%, 0.7);
}
p {
  margin: 0;
  font-size: 0.75em;
  font-weight: 100;
}
.dropzone {
  display: flex;
  flex-flow: column nowrap;
  justify-content: center;
  align-items: center;
  padding: 20px;
  border: 2px dashed hsla(0, 0%, 100%, 0.7);
  border-radius: 20px;
  overflow: hidden;
  transition: background-color 0.2s;
}
div.input-container {
  min-width: 80%;
}
.v-input {
  ::v-deep div.v-input__control {
    div.v-input__slot {
      margin-top: 4px;
      margin-bottom: 0 !important;
    }
    div.v-messages {
      display: none;
    }
  }
}
input.filebtn {
  display: none;
}
</style>