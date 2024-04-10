<template>
  <div class="grid-container">
    <div v-for="(letter,index) in letterOrder" class="grid-item" :style="getStyle(index)">
      {{letter.toUpperCase()}}
    </div>
  </div>
</template>
<script>
export default {
  setup(){
    const letterLearned=
    [
      2,2,1,2,1,2,2,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0
    ];
    const letterOrder= 
    [
    's',
'a',
't',
'm',
'o',
'p',
'b',
'i',
'n',
'r',
'e',
'd',
'c',
'u',
'f',
'j',
'k',
'l',
'h',
'v',
'z',
'w',
'g',
'y',
'x',
'q'

    ]
    return{
      letterOrder,letterLearned
    }

},
methods: {
  getStyle(index) {
    if(this.letterLearned[index]==0)
    {
      return { backgroundColor: '#2E4559' };
    }
    else if (this.letterLearned[index]==2) 
      {
        return { backgroundColor: '#92D95F' };
      }
      else if (this.letterLearned[index]== 1) {
        return { backgroundColor: '#F27D16' };
      }
  }

}
}
  
</script>
<style>

.grid-container {
  display: grid;
  grid-template-columns: repeat(7, 1fr); 
  grid-template-rows: repeat(4, 1fr);
  gap: 10px; /* Adjust the gap between items */
  padding:2%;
  
}

.grid-item {
  background-color: rgba(255, 255, 255, 0.8);
  border: 1px solid rgba(0, 0, 0, 0.8);
  padding: 15%;
  font-size: 30px;
  font-weight: bolder;
  text-align: center;
  border-radius: 20%;
}


</style>