<script setup>
  import { onMounted } from 'vue';


  onMounted(() => {
    document.title = "gimko | Home";
  });
</script>

<template>
  <div class="main-container">
    <div class="title-container">
      <h1>
        See How Grand is Your Family!
      </h1>
    </div>
    <div class="article-small">
      <h4>Gimko allows you to document your whole family tree and see how rich it really is!</h4>
      <div class="bg op-30"></div>
    </div>
    <div class="article-small" style="float: right;">
      <h4>Share your family tree with other people!</h4>
      <div class="bg op-30"></div>
    </div>
    <button class="hover-up-p" style="">
      <h3>Get started!</h3>
      <div class="bg"></div>
    </button>
  </div>
</template>

<style lang="scss">
  @import "../assets/css/base.scss";
  @import "../assets/css/home.scss";
  @import "../assets/css/colors.scss";
</style>