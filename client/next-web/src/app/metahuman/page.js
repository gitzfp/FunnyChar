import React, { useState, useEffect, useRef } from 'react';

const Metahuman = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [videoSrc, setVideoSrc] = useState('emma_idle.mp4');
  const [isLoading, setIsLoading] = useState(false)

  const getSpecialTalk = (id) => {
    const options = {
      method: 'GET',
      headers: {
        accept: 'application/json',
        authorization: 'Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6Ik53ek53TmV1R3ptcFZTQjNVZ0J4ZyJ9.eyJodHRwczovL2QtaWQuY29tL2ZlYXR1cmVzIjoiIiwiaHR0cHM6Ly9kLWlkLmNvbS9zdHJpcGVfcHJvZHVjdF9pZCI6IiIsImh0dHBzOi8vZC1pZC5jb20vc3RyaXBlX2N1c3RvbWVyX2lkIjoiIiwiaHR0cHM6Ly9kLWlkLmNvbS9zdHJpcGVfcHJvZHVjdF9uYW1lIjoidHJpYWwiLCJodHRwczovL2QtaWQuY29tL3N0cmlwZV9zdWJzY3JpcHRpb25faWQiOiIiLCJodHRwczovL2QtaWQuY29tL3N0cmlwZV9iaWxsaW5nX2ludGVydmFsIjoibW9udGgiLCJodHRwczovL2QtaWQuY29tL3N0cmlwZV9wbGFuX2dyb3VwIjoiZGVpZC10cmlhbCIsImh0dHBzOi8vZC1pZC5jb20vc3RyaXBlX3ByaWNlX2lkIjoiIiwiaHR0cHM6Ly9kLWlkLmNvbS9zdHJpcGVfcHJpY2VfY3JlZGl0cyI6IiIsImh0dHBzOi8vZC1pZC5jb20vY2hhdF9zdHJpcGVfc3Vic2NyaXB0aW9uX2lkIjoiIiwiaHR0cHM6Ly9kLWlkLmNvbS9jaGF0X3N0cmlwZV9wcmljZV9jcmVkaXRzIjoiIiwiaHR0cHM6Ly9kLWlkLmNvbS9jaGF0X3N0cmlwZV9wcmljZV9pZCI6IiIsImh0dHBzOi8vZC1pZC5jb20vcHJvdmlkZXIiOiJnb29nbGUtb2F1dGgyIiwiaHR0cHM6Ly9kLWlkLmNvbS9pc19uZXciOmZhbHNlLCJodHRwczovL2QtaWQuY29tL2FwaV9rZXlfbW9kaWZpZWRfYXQiOiIyMDI0LTA4LTA4VDE2OjIyOjQ2Ljg1M1oiLCJodHRwczovL2QtaWQuY29tL29yZ19pZCI6IiIsImh0dHBzOi8vZC1pZC5jb20vYXBwc192aXNpdGVkIjpbIkNoYXQiLCJTdHVkaW8iXSwiaHR0cHM6Ly9kLWlkLmNvbS9jeF9sb2dpY19pZCI6IiIsImh0dHBzOi8vZC1pZC5jb20vY3JlYXRpb25fdGltZXN0YW1wIjoiMjAyNC0wOC0wNFQwNzoyMTo1My44OTdaIiwiaHR0cHM6Ly9kLWlkLmNvbS9hcGlfZ2F0ZXdheV9rZXlfaWQiOiIyYzBmOTdpM2w2IiwiaHR0cHM6Ly9kLWlkLmNvbS91c2FnZV9pZGVudGlmaWVyX2tleSI6IkNIM1dRR3ZBMUJETEgybzNnV3U0NCIsImh0dHBzOi8vZC1pZC5jb20vaGFzaF9rZXkiOiJPcWt0SGpSWFYzSkRaWnVLWjdvc3QiLCJodHRwczovL2QtaWQuY29tL3ByaW1hcnkiOnRydWUsImh0dHBzOi8vZC1pZC5jb20vZW1haWwiOiJnZ3pmcDIwMjBAZ21haWwuY29tIiwiaHR0cHM6Ly9kLWlkLmNvbS9wYXltZW50X3Byb3ZpZGVyIjoic3RyaXBlIiwiaXNzIjoiaHR0cHM6Ly9hdXRoLmQtaWQuY29tLyIsInN1YiI6Imdvb2dsZS1vYXV0aDJ8MTA3MzYxMjQwNjMxMjI5NDQ0Mzg2IiwiYXVkIjpbImh0dHBzOi8vZC1pZC51cy5hdXRoMC5jb20vYXBpL3YyLyIsImh0dHBzOi8vZC1pZC51cy5hdXRoMC5jb20vdXNlcmluZm8iXSwiaWF0IjoxNzIzMzA5ODczLCJleHAiOjE3MjMzOTYyNzMsInNjb3BlIjoib3BlbmlkIHByb2ZpbGUgZW1haWwgcmVhZDpjdXJyZW50X3VzZXIgdXBkYXRlOmN1cnJlbnRfdXNlcl9tZXRhZGF0YSBvZmZsaW5lX2FjY2VzcyIsImF6cCI6Ikd6ck5JMU9yZTlGTTNFZURSZjNtM3ozVFN3MEpsUllxIn0.Ob7jz-DoI4YXvCaYm5KpzfxiWHQwEuP_eWNmlr3Ovn8b0o2wGA9L4rgbzXLpha0bMErnT-SDJZ-djIDndlNmhyeDgtgYQtVZooXSBX12U4_WdP4MbBK0bOU6PDs9hWVsMk36nB7fzzZnQgcj0_M3nqGkGaMjzlbvBcI9KTJ1tkkM371I1i1tC23fV4ME_RIZraIqXt5PId7wE4CbJBCvNgcmnIY4kqziRdlLEIPAllc_X2WCOsE1XonjB6XI1wJ6Vich6QM_EC6jpbpjvMYZrV9jbz7oBHagJQsX1o5_Kby4H7cms8raeoyYbaaWtVyNv9xduo77EcTS1_hLW_p13w'
      }
    };

    fetch(`https://api.d-id.com/talks/${id}`, options)
      .then(response => response.json())
      .then(response => {
        console.log(response, "----请求结果------")
        if(response.result_url){
          setIsPlaying(true)
          setVideoSrc(response.result_url) 
          setIsLoading(false)
        }
      })
      .catch(err => console.error(err));
      }
  const fetchVideo = () => {
    if(isLoading)return;
    setIsLoading(true)
    const options = {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
        authorization: 'Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6Ik53ek53TmV1R3ptcFZTQjNVZ0J4ZyJ9.eyJodHRwczovL2QtaWQuY29tL2ZlYXR1cmVzIjoiIiwiaHR0cHM6Ly9kLWlkLmNvbS9zdHJpcGVfcHJvZHVjdF9pZCI6IiIsImh0dHBzOi8vZC1pZC5jb20vc3RyaXBlX2N1c3RvbWVyX2lkIjoiIiwiaHR0cHM6Ly9kLWlkLmNvbS9zdHJpcGVfcHJvZHVjdF9uYW1lIjoidHJpYWwiLCJodHRwczovL2QtaWQuY29tL3N0cmlwZV9zdWJzY3JpcHRpb25faWQiOiIiLCJodHRwczovL2QtaWQuY29tL3N0cmlwZV9iaWxsaW5nX2ludGVydmFsIjoibW9udGgiLCJodHRwczovL2QtaWQuY29tL3N0cmlwZV9wbGFuX2dyb3VwIjoiZGVpZC10cmlhbCIsImh0dHBzOi8vZC1pZC5jb20vc3RyaXBlX3ByaWNlX2lkIjoiIiwiaHR0cHM6Ly9kLWlkLmNvbS9zdHJpcGVfcHJpY2VfY3JlZGl0cyI6IiIsImh0dHBzOi8vZC1pZC5jb20vY2hhdF9zdHJpcGVfc3Vic2NyaXB0aW9uX2lkIjoiIiwiaHR0cHM6Ly9kLWlkLmNvbS9jaGF0X3N0cmlwZV9wcmljZV9jcmVkaXRzIjoiIiwiaHR0cHM6Ly9kLWlkLmNvbS9jaGF0X3N0cmlwZV9wcmljZV9pZCI6IiIsImh0dHBzOi8vZC1pZC5jb20vcHJvdmlkZXIiOiJnb29nbGUtb2F1dGgyIiwiaHR0cHM6Ly9kLWlkLmNvbS9pc19uZXciOmZhbHNlLCJodHRwczovL2QtaWQuY29tL2FwaV9rZXlfbW9kaWZpZWRfYXQiOiIyMDI0LTA4LTA4VDE2OjIyOjQ2Ljg1M1oiLCJodHRwczovL2QtaWQuY29tL29yZ19pZCI6IiIsImh0dHBzOi8vZC1pZC5jb20vYXBwc192aXNpdGVkIjpbIkNoYXQiLCJTdHVkaW8iXSwiaHR0cHM6Ly9kLWlkLmNvbS9jeF9sb2dpY19pZCI6IiIsImh0dHBzOi8vZC1pZC5jb20vY3JlYXRpb25fdGltZXN0YW1wIjoiMjAyNC0wOC0wNFQwNzoyMTo1My44OTdaIiwiaHR0cHM6Ly9kLWlkLmNvbS9hcGlfZ2F0ZXdheV9rZXlfaWQiOiIyYzBmOTdpM2w2IiwiaHR0cHM6Ly9kLWlkLmNvbS91c2FnZV9pZGVudGlmaWVyX2tleSI6IkNIM1dRR3ZBMUJETEgybzNnV3U0NCIsImh0dHBzOi8vZC1pZC5jb20vaGFzaF9rZXkiOiJPcWt0SGpSWFYzSkRaWnVLWjdvc3QiLCJodHRwczovL2QtaWQuY29tL3ByaW1hcnkiOnRydWUsImh0dHBzOi8vZC1pZC5jb20vZW1haWwiOiJnZ3pmcDIwMjBAZ21haWwuY29tIiwiaHR0cHM6Ly9kLWlkLmNvbS9wYXltZW50X3Byb3ZpZGVyIjoic3RyaXBlIiwiaXNzIjoiaHR0cHM6Ly9hdXRoLmQtaWQuY29tLyIsInN1YiI6Imdvb2dsZS1vYXV0aDJ8MTA3MzYxMjQwNjMxMjI5NDQ0Mzg2IiwiYXVkIjpbImh0dHBzOi8vZC1pZC51cy5hdXRoMC5jb20vYXBpL3YyLyIsImh0dHBzOi8vZC1pZC51cy5hdXRoMC5jb20vdXNlcmluZm8iXSwiaWF0IjoxNzIzMzA5ODczLCJleHAiOjE3MjMzOTYyNzMsInNjb3BlIjoib3BlbmlkIHByb2ZpbGUgZW1haWwgcmVhZDpjdXJyZW50X3VzZXIgdXBkYXRlOmN1cnJlbnRfdXNlcl9tZXRhZGF0YSBvZmZsaW5lX2FjY2VzcyIsImF6cCI6Ikd6ck5JMU9yZTlGTTNFZURSZjNtM3ozVFN3MEpsUllxIn0.Ob7jz-DoI4YXvCaYm5KpzfxiWHQwEuP_eWNmlr3Ovn8b0o2wGA9L4rgbzXLpha0bMErnT-SDJZ-djIDndlNmhyeDgtgYQtVZooXSBX12U4_WdP4MbBK0bOU6PDs9hWVsMk36nB7fzzZnQgcj0_M3nqGkGaMjzlbvBcI9KTJ1tkkM371I1i1tC23fV4ME_RIZraIqXt5PId7wE4CbJBCvNgcmnIY4kqziRdlLEIPAllc_X2WCOsE1XonjB6XI1wJ6Vich6QM_EC6jpbpjvMYZrV9jbz7oBHagJQsX1o5_Kby4H7cms8raeoyYbaaWtVyNv9xduo77EcTS1_hLW_p13w'
      },
      body: JSON.stringify({
        script: {
          type: 'text',
          subtitles: 'false',
          provider: { type: 'microsoft', voice_id: 'en-US-JennyNeural' },
          input: '你好啊'
        },
        config: { fluent: 'false', pad_audio: '0.0' },
        source_url: 'https://storage.googleapis.com/funnychar/user_upload/emma_idle.png'
      })
    };

    fetch('https://api.d-id.com/talks', options)
      .then(response => response.json())
      .then(response => {
        console.log(response,'=========打印======')
        if (response?.id) {
          getSpecialTalk(response.id)
        }
      })
      .catch(err => console.error(err));
  };

  useEffect(() => {
    // fetchVideo();
    getSpecialTalk('tlk_Tz6uE53euJwN6_GQCl-2M')
  }, []);

  const handleVideoEnd = () => {
    setIsPlaying(false);
    setVideoSrc('http://localhost:3000/emma_idle.mp4');
  };

  return (
    <>
      {!isPlaying && (
        <video
          src={'http://localhost:3000/emma_idle.mp4'}
          playsInline
          className='w-48'
        />
      )}
      {isPlaying && (
        <video
          src={videoSrc}
          playsInline
          autoPlay
          onEnded={handleVideoEnd}
          className='w-48'
        />
      )}
    </>
  );
};

export default Metahuman;