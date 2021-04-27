<template>
  <v-app>
    <v-app-bar app dark>
      <div class="d-flex align-center">CIRCUIT PATCH CONVERTER</div>

      <v-spacer></v-spacer>

      <v-btn href="/novation/2021/04/27/circuit-patch-converter.html" target="_blank" text>
        <span class="mr-2">How it works</span>
        <v-icon>mdi-open-in-new</v-icon>
      </v-btn>
    </v-app-bar>

    <v-main>
      <v-col class="mb-5 mt-10" cols="12">
        <v-row justify="center" class="text-h6 text-center mb-8">
          A small utility for fast patch file conversion between Novation Circuit and Circuit Tracks format. <br/>
          Works in both directions.
        </v-row>
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
            :disabled="!filesNotEmpty || downloadInProcess"
            @click="convertAndDownloadFiles"
          >
            <v-icon v-if="!downloadInProcess" left dark>mdi-content-save</v-icon>
            <v-progress-circular
              v-else
              :size="18"
              :width="3"
              color="green"
              indeterminate
              class="mr-1"
            ></v-progress-circular>
            Convert and save
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
    ...mapState([ 'files', 'downloadInProcess' ]),
    ...mapGetters([ 'filesNotEmpty' ])
  },
  methods: {
    ...mapActions([ 'processFiles', 'convertAndDownloadFiles' ])
  },
};
</script>
