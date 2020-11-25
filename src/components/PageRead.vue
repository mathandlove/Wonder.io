<template>
  <img alt="" class="h-100" src="../assets/Images/notepadWithLines.png"/>
  <div class="PageTextAlign">
    <div v-for="item in this.displayArray" :key="item">
      <div v-if="typeof item == 'string'" class="pb-4 textSize">{{item}}</div>
      <div v-else-if="item.image">
        <img :src="require(`../assets/Books/book${bookNumber}/images/${item.image}.png`)"
             alt="" class="w-100" />
      </div>
      <div v-else>Add Display for {{item}}</div>
    </div>
  </div>
</template>

<script>
export default {
  props: {
    pageText: {
      type: String,
      required: true,
    },
    bookNumber: {
      type: String,
      required: true,
    },
  },
  data() {
    const displayArray = [];
    return { displayArray };
  },
  created() {
    const tempArray = this.pageText.split('\n');
    tempArray.forEach((item) => {
      if (item.includes('<im>')) {
        const splitHeight = item.split('<height>');
        const splitNumber = splitHeight[0].split('<im>');
        this.displayArray.push({ image: splitNumber.pop(), height: splitHeight.pop() });
      } else this.displayArray.push(item);
    });
    console.log(this.displayArray);
  },
};
</script>

<style scoped>
.PageTextAlign {
  position: absolute;
  top: 14.5vh;
  left: 50%;
  transform: translate(-50%);
  width: 100vh;
  max-width: 45vh;
}
.textSize {
  text-align: left;
  font-size: 3.25vh;
}
</style>
