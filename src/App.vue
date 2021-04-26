<template>
  <v-app>
    <v-app-bar app dark>
      <div class="d-flex align-center">CIRCUIT PATCH CONVERTER</div>

      <v-spacer></v-spacer>

      <v-btn href="" target="_blank" text>
        <span class="mr-2">About</span>
        <v-icon>mdi-open-in-new</v-icon>
      </v-btn>
    </v-app-bar>

    <v-main>
      <v-col class="mb-5 mt-10" cols="12">
        <v-row justify="center">
          <FilesSelector
            label="Drop your .syx files here, or open from disk"
            accept=".syx"
            :multiple="true"
          />
        </v-row>
      </v-col>

      <v-col class="mb-5" cols="12">
        <v-row justify="center">
          <v-btn
            depressed
            color="primary"
            large
            :disabled="filesNotEmpty !== true"
            @click="convertAndDownloadFiles"
          >
            <v-icon left dark>mdi-cloud-download</v-icon>
            Convert and download
          </v-btn>
        </v-row>
      </v-col>
    </v-main>
  </v-app>
</template>

<script>
import { mapState, mapGetters, mapActions } from "vuex";
import FilesSelector from "./components/FilesSelector";

export default {
  name: "App",

  components: {
    FilesSelector,
  },
  watch: {
    files: function() {
      this.processFiles();
    }
  },
  computed: {
    ...mapState([ 'files' ]),
    ...mapGetters([ 'filesNotEmpty' ])
  },
  methods: {
    downloadURL: function (data, fileName) {
      // https://stackoverflow.com/questions/25354313/saving-a-uint8array-to-a-binary-file/62176999#62176999
      const a = document.createElement("a");
      a.href = data;
      a.download = fileName;
      document.body.appendChild(a);
      a.style.display = "none";
      a.click();
      a.remove();
    },
    downloadFile: function (data, fileName, mimeType) {
      const blob = new Blob([data], {
        type: mimeType,
      });

      const url = window.URL.createObjectURL(blob);
      this.downloadURL(url, fileName);
      setTimeout(() => window.URL.revokeObjectURL(url), 1000);
    },
    convertAndDownloadFiles: function () {
      // TODO: remove this implementation
      for (let file of this.files) {
        this.downloadFile(file, "MyCoolPatch.syx", "application/octet-stream");
      }
    },
    ...mapActions([ 'processFiles' ])
  },
};
</script>
