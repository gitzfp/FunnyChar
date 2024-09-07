'use client';
import ExploreTab from './ExploreTab';
import MyTab from './MyTab';
import TabButton from '@/components/TabButton';

import { useSearchParams } from 'next/navigation';
import { useEffect } from 'react';
import { useAppStore } from '@/zustand/store';

export default function Tabs({ characters }) {
  const { user } = useAppStore();
  const { tabNow, setTabNow } = useAppStore();
  const searchParams = useSearchParams();

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab) {
      setTabNow(tab);
    }
  }, []);

  function charactersShown(tab) {
    if (tab === 'explore') {
      return characters.filter((character) => character.source === 'default');
    } else if (tab === 'community') {
      return characters.filter((character) => character.source === 'community');
    }
  }

  return (
    <>
      <ExploreTab
        characters={characters}
        isDisplay={tabNow === 'explore' || tabNow === 'community'}
      />
      {user && <MyTab isDisplay={tabNow === 'myCharacters'} />}
      <div className='flex flex-row justify-center items-center fixed bottom-0 w-full h-10  border-2 p-10 border-tab'>
        <TabButton isSelected={tabNow === 'explore'} handlePress={() => setTabNow('explore')}>
          对话
        </TabButton>
        <TabButton isSelected={tabNow === 'community'} handlePress={() => setTabNow('community')}>
          发现
        </TabButton>
        {/* <Link href='/create'>
          <TabButton isSelected={tabNow === 'create'}>创建</TabButton>
        </Link> */}
        <TabButton
          isSelected={user && tabNow === 'myCharacters'}
          isDisabled={user == null}
          handlePress={() => setTabNow('myCharacters')}
        >
          我的
        </TabButton>
      </div>
    </>
  );
}
