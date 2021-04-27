<template>
  <v-card class="mb-5" shaped elevation="2">
    <v-card-title>
      <v-icon class="mr-1" v-if="fileInfo.metaData">{{
        fileInfo.metaData && fileInfo.metaData.fileType === "Patch Pack"
          ? "mdi-file-multiple"
          : "mdi-file"
      }}</v-icon>
      {{ fileInfo.file.name }}
      <v-spacer></v-spacer>
      <v-btn icon @click="remove()">
        <v-icon>mdi-close</v-icon>
      </v-btn>
    </v-card-title>
    <v-card-subtitle
      class="pb-3 pl-5"
      v-if="fileInfo.metaData && !fileInfo.metaData.error"
    >
      {{ fileInfo.metaData.product + " - " + fileInfo.metaData.fileType }}
    </v-card-subtitle>
    <v-card-text>
      <ul class="pl-5" v-if="fileInfo.metaData && !fileInfo.metaData.error">
        <li
          v-for="(patch, index) of fileInfo.metaData.patches"
          :key="index + patch.name"
          :style="
            fileInfo.metaData.fileType === 'Patch Pack'
              ? 'list-style-type: decimal'
              : ''
          "
          class="mb-4"
        >
          <h3 v-if="!patch.error">{{ patch.name }}</h3>
          <v-alert
            v-else
            dense
            border="left"
            type="error"
            color="red lighten-2"
            dark
          >
            {{ patch.error }}
          </v-alert>
          <v-chip
            v-if="!patch.error"
            color="deep-purple lighten-2"
            class="mt-2 mr-2"
            outlined
          >
            Genre: <strong>{{ patch.genre }}</strong>
          </v-chip>
          <v-chip
            v-if="!patch.error"
            color="indigo lighten-2"
            class="mt-2"
            outlined
          >
            Category: <strong>{{ patch.category }}</strong>
          </v-chip>
        </li>
      </ul>
      <v-alert
        dense
        border="left"
        type="error"
        v-if="fileInfo.metaData && fileInfo.metaData.error"
        color="red lighten-2"
        dark
      >
        {{ fileInfo.metaData.error }}
      </v-alert>
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
      this.$emit("remove", null);
    },
    ...mapMutations(["removeFiles"]),
  },
};
</script>
