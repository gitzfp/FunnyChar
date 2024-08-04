import { Avatar } from '@nextui-org/avatar';
import Image from 'next/image';
import realCharSVG from '@/assets/svgs/funnychar.svg';
import { useAppStore } from '@/zustand/store';

export default function ChatPreview() {
  const { character, chatContent } = useAppStore();

  return (
    <ul className="border-2 border-real-blue-500/30 rounded-2xl bg-white/10 max-h-[40vh] overflow-scroll">
      {
        chatContent.map((line) => (
          <li
            key={line.timeStamp}
            className="flex flex-row p-2 md:p-6 gap-4 text-sm md:text-lg odd:bg-real-blue-500/10"
          >
            {line.from === 'character' && (
              <Avatar
                src={character.image_url}
                size="sm"
                radius="sm"
                classNames={{base: 'shrink-0'}}
              />
            )}
            {line.from === 'user' && (
              <Image
                src={realCharSVG}
                alt="user"
                className="w-8 h-8 rounded-lg"
              />
            )}
            <span>{line.content}</span>
          </li>
        ))
      }
    </ul>
  );
}