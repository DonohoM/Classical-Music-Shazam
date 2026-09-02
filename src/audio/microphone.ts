export interface MicSession {
  audioContext: AudioContext;
  stream: MediaStream;
  stop: () => void;
}

/**
 * Requests mic access and pipes raw samples to `onFrame` at roughly 25fps
 * via ScriptProcessorNode. (AudioWorklet would avoid the deprecation, but
 * ScriptProcessorNode keeps the sample buffer on the main thread, which is
 * what the pitch/melody UI reads from directly — simplest for a single-file app.)
 */
export async function startMicrophone(
  onFrame: (samples: Float32Array, sampleRate: number) => void,
): Promise<MicSession> {
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: {
      echoCancellation: false,
      noiseSuppression: false,
      autoGainControl: false,
    },
  });

  const audioContext = new AudioContext();
  const source = audioContext.createMediaStreamSource(stream);

  const bufferSize = 2048;
  const processor = audioContext.createScriptProcessor(bufferSize, 1, 1);
  processor.onaudioprocess = (event) => {
    const input = event.inputBuffer.getChannelData(0);
    onFrame(new Float32Array(input), audioContext.sampleRate);
  };

  // ScriptProcessorNode only fires while connected to a destination.
  const silentGain = audioContext.createGain();
  silentGain.gain.value = 0;
  source.connect(processor);
  processor.connect(silentGain);
  silentGain.connect(audioContext.destination);

  const stop = () => {
    processor.disconnect();
    silentGain.disconnect();
    source.disconnect();
    stream.getTracks().forEach((track) => track.stop());
    void audioContext.close();
  };

  return { audioContext, stream, stop };
}
