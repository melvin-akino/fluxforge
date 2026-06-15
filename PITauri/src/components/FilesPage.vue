<template>
  <div style="height:100%;display:flex;flex-direction:column;min-height:0">
    <FileManager @download="onDownload" @open-design="onOpenDesign" />
  </div>
</template>

<script setup>
import { onMounted } from 'vue';
import { useFilesStore, FileManager, useDesignStore } from '@fluxforge/shared';
import { invoke } from '@tauri-apps/api/core';

const store       = useFilesStore();
const designStore = useDesignStore();
const emit        = defineEmits(['navigate', 'design-opened']);

onMounted(() => store.fetchAll());

async function onDownload(file) {
  try {
    const uploadDir = await invoke('get_upload_dir');
    const fullPath  = `${uploadDir}\\${file.stored_name}`;
    await navigator.clipboard.writeText(fullPath);
    alert(`File path copied to clipboard:\n${fullPath}`);
  } catch (e) {
    console.warn('Could not get file path:', e);
  }
}

async function onOpenDesign(file) {
  try {
    let design = null;

    // 1. In-memory cache (same session, just-created file)
    if (file._designData) {
      design = file._designData;
    }

    // 2. Read the actual file from disk via Rust
    if (!design && file.stored_name) {
      try {
        const uploadDir = await invoke('get_upload_dir');
        const content   = await invoke('read_file_text', {
          path: `${uploadDir}/${file.stored_name}`,
        });
        design = JSON.parse(content);
      } catch (e) {
        console.warn('Could not read file via Rust:', e);
      }
    }

    // 3. Minimal fallback
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

    // Normalise: old flat designs get wrapped into new UDS structure
    if (design && !design.meta) {
      design = {
        meta: {
          fileName:    design.fileName || (file.original_name||'').replace(/\.uds$/i,'') || 'Design',
          createdAt:   design.createdAt || file.created_at,
          variant:     design._variant || '',
          topology:    design.topology || 'Flyback',
          family:      design.family || 'HPFC-1',
          pkg:         design.pkg || 'EG (eSIP-7C)',
          frequency:   design.frequency || '132 kHz',
          feedbackType:design.feedbackType || '',
          inputSpec:   design.inputSpec || '',
          enclosure:   design.enclosure || '',
          totalPower:  design.totalPower || 0,
          siUnits:     design.siUnits ?? true,
          componentSet:design.componentSet || 'All Records',
        },
        spec: {
          input: { vMin:design.vMin, vMax:design.vMax, lineFreq:design.lineFreq, inputType:design.inputType },
          outputs: design.outputs || [],
          options: {
            peakLoads:design.peakLoads, ledDriver:design.ledDriver,
            operationMode:design.operationMode, ccThreshold:design.ccThreshold,
            transformerType:design.transformerType, coreMaterial:design.coreMaterial,
            shieldWindings:design.shieldWindings,
          },
        },
        components: design.components || {},
        schematic:  design.schematic  || { frozen: [] },
        notes:      design.notes      || '',
      };
    }
    designStore.openDesign(design);
    emit('navigate', 'active-design');
    emit('design-opened');
  } catch (e) {
    console.error('Failed to open design:', e);
  }
}
</script>
