<template>
  <v-card
    class="mb-5"
    shaped
    elevation="2"    
  >
    <v-card-title>
      <v-icon class="mr-1" v-if="fileInfo.metaData && !fileInfo.metaData.error">{{
        fileInfo.metaData && fileInfo.metaData.fileType === "Patch Pack file"
          ? "mdi-file-multiple"
          : "mdi-file"
      }}</v-icon>
      <v-icon class="mr-1" color="red" v-if="fileInfo.metaData && fileInfo.metaData.error">
        mdi-alert
      </v-icon> 
      {{ fileInfo.file.name }}
      <v-spacer></v-spacer>
      <v-btn icon @click="remove()">
        <v-icon>mdi-close</v-icon>
      </v-btn>
    </v-card-title>
    <v-card-subtitle class="pb-1" v-if="fileInfo.metaData && !fileInfo.metaData.error">
      {{ fileInfo.metaData.product + " - " + fileInfo.metaData.fileType }}
    </v-card-subtitle>
    <v-card-text>
      <h3 v-if="fileInfo.metaData && !fileInfo.metaData.error">{{ fileInfo.metaData.patchName }}</h3>
      <v-chip v-if="fileInfo.metaData && !fileInfo.metaData.error" class="mt-2 mr-2" outlined>
        Genre: <strong>{{ fileInfo.metaData.patchGenre }}</strong>
      </v-chip>
      <v-chip v-if="fileInfo.metaData && !fileInfo.metaData.error" class="mt-2" outlined>
        Category: <strong>{{ fileInfo.metaData.patchCategory }}</strong>
      </v-chip>
      <span v-if="fileInfo.metaData && fileInfo.metaData.error"> {{ fileInfo.metaData.error }} </span>
    </v-card-text>
  </v-card>
</template>

<script>
import { mapMutations } from "vuex";
export default {
  props: {
    fileInfo: {
      type: Object,
      required: true,
    },
  },
  methods: {
    remove() {
      this.$emit("remove", null)
    },
    ...mapMutations([
      'removeFiles'
    ])
  }
};
</script>
