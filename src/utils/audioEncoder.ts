import { ConversionOptions, ProcessorMode } from '../types';
import { FEATURES } from '../config/features';
import { convertViaServer } from './serverApi';

/**
 * Audio converter gated by FEATURES.mediaToolsEnabled for free-tier server sustainability.
 * Preserves Web Audio PCM WAV + FFmpeg backend support when media tools are enabled.
 */
export async function convertAudioFile(
  file: File,
  targetFormat: string,
  options: ConversionOptions = {},
  onProgress?: (progress: number, message: string) => void,
  jobId?: string
): Promise<{ blob: Blob; processorMode: ProcessorMode }> {
  if (!FEATURES.mediaToolsEnabled) {
    throw new Error(
      'Audio conversion tools are temporarily unavailable on this deployment while Fylovanta prioritizes fast browser-side PDF, image, and document tools.'
    );
  }

  const tgt = targetFormat.toLowerCase();

  if (tgt !== 'wav') {
    const serverRes = await convertViaServer('/api/convert', file, tgt, options, onProgress, jobId);
    return { blob: serverRes.blob, processorMode: 'server' };
  }

  onProgress?.(15, 'Reading audio data...');
  const arrayBuffer = await file.arrayBuffer();

  const AudioContextClass =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextClass) {
    const serverRes = await convertViaServer('/api/convert', file, 'wav', options, onProgress, jobId);
    return { blob: serverRes.blob, processorMode: 'server' };
  }

  const audioCtx = new AudioContextClass();
  onProgress?.(35, 'Decoding audio channels locally...');

  let audioBuffer: AudioBuffer;
  try {
    audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
  } catch {
    audioCtx.close();
    onProgress?.(40, 'Routing to FFmpeg audio decoder...');
    const serverRes = await convertViaServer('/api/convert', file, 'wav', options, onProgress, jobId);
    return { blob: serverRes.blob, processorMode: 'server' };
  }

  onProgress?.(55, 'Processing audio stream...');

  const numChannels = options.audioChannels
    ? Math.min(2, Math.max(1, parseInt(options.audioChannels, 10)))
    : Math.min(2, audioBuffer.numberOfChannels);
  const sampleRate = options.audioSampleRate || audioBuffer.sampleRate;
  const volume = options.audioVolume ?? 1.0;

  const offlineCtx = new OfflineAudioContext(
    numChannels,
    Math.ceil(audioBuffer.duration * sampleRate),
    sampleRate
  );

  const source = offlineCtx.createBufferSource();
  source.buffer = audioBuffer;

  const gainNode = offlineCtx.createGain();
  gainNode.gain.value = volume;

  source.connect(gainNode);
  gainNode.connect(offlineCtx.destination);

  source.start(0);
  onProgress?.(75, 'Rendering PCM audio track...');
  const renderedBuffer = await offlineCtx.startRendering();
  audioCtx.close();

  onProgress?.(90, 'Encoding 16-bit WAV file...');
  const wavBlob = audioBufferToWavBlob(renderedBuffer);

  if (!wavBlob || wavBlob.size === 0) {
    throw new Error('The converted file could not be generated correctly. Please try again.');
  }

  onProgress?.(100, 'Complete');
  return { blob: wavBlob, processorMode: 'browser' };
}

function audioBufferToWavBlob(buffer: AudioBuffer): Blob {
  const numOfChan = buffer.numberOfChannels;
  const length = buffer.length * numOfChan * 2 + 44;
  const out = new DataView(new ArrayBuffer(length));
  const channels: Float32Array[] = [];
  let sample: number;
  let offset = 0;
  let pos = 0;

  function writeString(str: string) {
    for (let i = 0; i < str.length; i++) {
      out.setUint8(pos++, str.charCodeAt(i));
    }
  }

  function setUint16(data: number) {
    out.setUint16(pos, data, true);
    pos += 2;
  }

  function setUint32(data: number) {
    out.setUint32(pos, data, true);
    pos += 4;
  }

  writeString('RIFF');
  setUint32(length - 8);
  writeString('WAVE');

  writeString('fmt ');
  setUint32(16);
  setUint16(1);
  setUint16(numOfChan);
  setUint32(buffer.sampleRate);
  setUint32(buffer.sampleRate * 2 * numOfChan);
  setUint16(numOfChan * 2);
  setUint16(16);

  writeString('data');
  setUint32(length - pos - 4);

  for (let i = 0; i < buffer.numberOfChannels; i++) {
    channels.push(buffer.getChannelData(i));
  }

  while (offset < buffer.length) {
    for (let i = 0; i < numOfChan; i++) {
      sample = Math.max(-1, Math.min(1, channels[i][offset]));
      sample = (0.5 + sample < 0 ? sample * 32768 : sample * 32767) | 0;
      out.setInt16(pos, sample, true);
      pos += 2;
    }
    offset++;
  }

  return new Blob([out.buffer], { type: 'audio/wav' });
}
