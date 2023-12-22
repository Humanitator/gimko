<script setup>
  import { onMounted } from 'vue';


  onMounted(() => {
    document.title = "gimko | Sākums";
  });
</script>

<template>
  <div class="main-container">
    <div class="title-container">
      <h1>
        Redzi, cik liela ir tava ģimene!
      </h1>
    </div>
    <div class="article-small">
      <h4>Gimko ļauj tev dokumentēt visu savu ģimenes koku un redzēt tā vērtību!</h4>
      <div class="bg op-30"></div>
    </div>
    <div class="article-small" style="float: right;">
      <h4>Dalies ar savu ģimenes koku ar citiem cilvēkiem!</h4>
      <div class="bg op-30"></div>
    </div>
    <!-- <button class="hover-up-p" style="">
      <h3>Sākt!</h3>
      <div class="bg"></div>
    </button> -->
  </div>
</template>

<style lang="scss">
  @import "../assets/css/base.scss";
  @import "../assets/css/home.scss";
  @import "../assets/css/colors.scss";
</style>