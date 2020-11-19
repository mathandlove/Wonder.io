<template>
  <div class="textAlign">
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
.textAlign {
  padding-top: 40%;
  padding-left: 0;
  padding-right: 0;
}
@media (max-width: 767px) {
  .textAlign {
    padding-top: 30%;
    padding-left: 15%;
    padding-right: 15%;
  }
}
@media (min-width: 992px) {
  .textAlign {
    padding-top: 25%;
    padding-left: 15%;
    padding-right: 15%;
  }
}
.textSize {
  font-size: 20px;
}
</style>
