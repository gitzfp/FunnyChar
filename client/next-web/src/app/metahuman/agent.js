import React, { useEffect } from 'react';

const DIDAgent = () => {
  useEffect(() => {
    const script = document.createElement('script');
    script.type = 'module';
    script.src = 'https://agent.d-id.com/v1/index.js';
    script.setAttribute('data-name', 'did-agent');
    script.setAttribute('data-mode', 'fabio');
    script.setAttribute('data-client-key', 'Z29vZzxlLW9hdXRoMnwxMDczNjEyNDA2MzEyMjk0NDQzODY6TkxwNnBabnIOOVE4czF0aIJNdmNM');
    script.setAttribute('data-agent-id', 'agt_XpDLFvcW');
    script.setAttribute('data-monitor', 'true');
    document.body.appendChild(script);
  }, []);

  return <div><iframe className='h-full' title="d-id" src='https://studio.d-id.com/agents/share?id=agt_XpDLFvcW&key=WjI5dloyeGxMVzloZFhSb01ud3hNRGN6TmpFeU5EQTJNekV5TWprME5EUXpPRFk2VGt4d05uQmFibkkwT1ZFNGN6RjBhbEpOZG1OTQ=='/></div>;
};

export default DIDAgent;