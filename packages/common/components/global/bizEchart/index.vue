<template>
  <div ref="chartRef" class="biz-echart" :style="{ height, width }"></div>
</template>

<script setup>
import { onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue';
import * as echarts from 'echarts';

const props = defineProps({
  option: {
    type: Object,
    required: true,
  },
  height: {
    type: String,
    default: '320px',
  },
  width: {
    type: String,
    default: '100%',
  },
  theme: {
    type: [String, Object],
    default: undefined,
  },
  autoresize: {
    type: Boolean,
    default: true,
  },
});

const chartRef = ref(null);
const chartInstance = shallowRef(null);
let resizeObserver = null;

const bindResizeObserver = () => {
  if (!props.autoresize || !chartRef.value || typeof ResizeObserver === 'undefined') {
    return;
  }

  resizeObserver?.disconnect();
  resizeObserver = new ResizeObserver(() => resizeChart());
  resizeObserver.observe(chartRef.value);
};

const resizeChart = () => {
  chartInstance.value?.resize();
};

const destroyChart = () => {
  resizeObserver?.disconnect();
  resizeObserver = null;

  if (chartInstance.value) {
    chartInstance.value.dispose();
    chartInstance.value = null;
  }
};

const renderChart = () => {
  if (!chartRef.value) {
    return;
  }

  if (!chartInstance.value) {
    chartInstance.value = echarts.init(chartRef.value, props.theme);
  }

  chartInstance.value.setOption(props.option, true);
  resizeChart();
};

watch(
  () => props.option,
  () => {
    renderChart();
  },
  { deep: true },
);

watch(
  () => props.theme,
  () => {
    destroyChart();
    renderChart();
  },
);

watch(
  () => props.autoresize,
  (enabled) => {
    if (!enabled) {
      resizeObserver?.disconnect();
      resizeObserver = null;
      return;
    }

    bindResizeObserver();
  },
);

onMounted(() => {
  renderChart();
  bindResizeObserver();
  window.addEventListener('resize', resizeChart);
});

onBeforeUnmount(() => {
  window.removeEventListener('resize', resizeChart);
  destroyChart();
});
</script>

<style scoped>
.biz-echart {
  min-height: 240px;
}
</style>
