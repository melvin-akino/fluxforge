<template>
  <div style="height:calc(100vh - 54px);display:flex;flex-direction:column;min-height:0">
    <FileManager @download="onDownload" @open-design="onOpenDesign" />
  </div>
</template>

<script setup>
import { onMounted } from 'vue';
import { useFilesStore, FileManager, useDesignStore, api } from '@fluxforge/shared';
import { useRouter } from 'vue-router';

const store       = useFilesStore();
const designStore = useDesignStore();
const router      = useRouter();

onMounted(() => store.fetchAll());

function onDownload(file) {
  const url  = api.fileUrl(file.stored_name);
  const link = document.createElement('a');
  link.href  = url;
  link.download = file.original_name;
  link.click();
}

async function onOpenDesign(file) {
  try {
    let design = null;

    // 1. In-memory cache (same session, just-created file)
    if (file._designData) {
      design = file._designData;
    }

    // 2. Fetch the actual .uds JSON from the uploads static endpoint
    if (!design && file.stored_name) {
      try {
        design = await api.fetchFileContent(file.stored_name);
      } catch (e) {
        console.warn('Could not fetch uploaded file:', e);
      }
    }

    // 3. Minimal fallback so the viewer opens with the file name
    if (!design) {
      design = {
        fileName: (file.original_name || 'Design').replace(/\.uds$/i, ''),
        topology: 'Flyback',
        family: 'HPFC-1',
        pkg: 'EG (eSIP-7C)',
        feedbackType: 'Secondary TL431',
        vMin: 85, vMax: 265, lineFreq: 50,
        inputSpec: 'Universal (85 - 265 V)',
        frequency: '132 kHz',
        outputs: [{ voltage: 12, current: 1, peakCurrent: 1, dutyCycle: 0, tolPos: 5, tolNeg: 5 }],
        totalPower: 12,
        operationMode: 'CV Only',
        componentSet: 'All Records',
        transformerType: 'Wire Wound',
        coreMaterial: '3F3',
        shieldWindings: false,
        createdAt: file.created_at,
      };
    }

    designStore.openDesign(design);
    router.push('/design');
  } catch (e) {
    console.error('Failed to open design:', e);
  }
}
</script>
