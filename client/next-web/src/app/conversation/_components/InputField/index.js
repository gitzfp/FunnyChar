import { useState } from 'react';
import { Button} from '@nextui-org/button'; 
import { Input } from '@nextui-org/input'
import { IoIosSend } from 'react-icons/io';
import ClickToTalk from './ClickToTalk';

import { useAppStore } from '@/zustand/store';
import { clientMsgId } from '@/util/common';

export default function InputField() {
  const [text, setText] = useState('');
  const { sendOverSocket, appendUserChat} = useAppStore();
  const { stopAudioPlayback } = useAppStore();

  function handleOnEnter() {
    if (text) {
      stopAudioPlayback();
      appendUserChat(text);
      const finalData = {
        content: text,
        type: 'text',
        clientMsgId: clientMsgId()
      };
      sendOverSocket(JSON.stringify(finalData));
      setText('');
    }
  }

  const renderBottomButtons = () => {
    return (
        <div className='flex flex-row justify-between items-center'>
          <div className='pl-2 flex flex-row gap-1'>
            <ClickToTalk className='' />
          </div>
           <Input 
            value={text} 
            onChange={(e) => setText(e.target.value)} 
            onKeyDown={(e) => e.key === 'Enter' && handleOnEnter()}
            placeholder="Type your message here..."
            clearable
          />
          <div className='mr-4 h-10'>
            <Button
              aria-label='send'
              size='md'
              isDisabled={text === ''}
              className='bg-real-blue-500 px-2 min-w-fit sm:min-w-16 sm:px-4 md:flex h-9 disabled:bg-transparent'
              onPress={handleOnEnter}
            >
              <IoIosSend size='2em' />
            </Button>
          </div>
        </div>
    );
  }

  return (
    <div className='flex justify-center md:mx-auto md:w-unit-9xl lg:w-[892px]'>
      <div className='flex md:hidden flex-col justify-between w-full pb-1'>
        {renderBottomButtons()} 
      </div>
      <div className='hidden md:flex flex-col justify-center w-full pb-1'>
        {renderBottomButtons()}
      </div>
    </div>
  );
}