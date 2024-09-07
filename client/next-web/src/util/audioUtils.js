// play a single audio chunk
const playAudio = (
    audioPlayer,
    bufferSource,
) => {
    return new Promise(resolve => {
        bufferSource.onended = ()=>{
            resolve();
        };
        bufferSource.start();
        audioPlayer.current
            .play()
            .then(() => {
                audioPlayer.current.muted = false; // Unmute after playback starts
            })
            .catch(error => {
                if (error.name === 'NotSupportedError') {
                    alert(
                        `Playback failed because: ${error}. Please check https://elevenlabs.io/subscription if you have encough characters left.`
                    );
                } else {
                    alert(`Playback failed because: ${error}`);
                }
            });
    });
};

// play all audio chunks
export const playAudios = async (
    audioContext,
    audioPlayerRef,
    audioQueueRef,
    isPlaying,
    setIsPlaying,
    audioSourceNode,
    popAudioQueueFront
) => {
    console.log('playAudios called');
    if (!audioContext) {
        console.log('audioContext not available, play cancelled.');
        return;
    }
    if (!audioPlayerRef.current) {
        console.log('audioPlayer not available, play cancelled.');
        return;
    }
    if (!audioSourceNode) {
        console.log('audioSourceNode not available, play cancelled.');
        return;
    }
    if (isPlaying) {
        console.log('Already playing, play cancelled.');
        return;
    }
    if (audioQueueRef.current?.length === 0) {
        console.log('Queue is empty, play cancelled.');
        return;
    }
    setIsPlaying(true);
    try {
        while (audioContext && audioPlayerRef.current && audioSourceNode && audioQueueRef.current?.length > 0) {
            const currentAudio = audioQueueRef.current[0];
            console.log('Current audio details:', {
                byteLength: currentAudio?.byteLength,
                type: currentAudio?.type,
                isArrayBuffer: currentAudio instanceof ArrayBuffer,
            });

            if (!currentAudio || currentAudio.byteLength === 0) {
                console.log('Invalid audio data, removing from queue.');
                popAudioQueueFront();
                continue;
            }

            try {
                const audioBuffer = await audioContext.decodeAudioData(currentAudio);
                const bs = audioContext.createBufferSource();
                bs.buffer = audioBuffer;
                bs.connect(audioSourceNode);

                await playAudio(audioPlayerRef, bs);
            } catch (decodeError) {
                console.error('Error decoding audio:', decodeError);
                console.log('Skipping problematic audio chunk');
            }
            popAudioQueueFront();
        }
        console.log('Done playing audios');
    } catch (error) {
        console.error('Error in playAudios:', error);
    } finally {
        setIsPlaying(false);
    }
};
