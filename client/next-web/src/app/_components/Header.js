'use client';
import {
  Navbar,
  NavbarBrand,
  NavbarContent,
  NavbarItem,
} from '@nextui-org/navbar';
import SignIn from './SignIn';
import UserDropdown from './UserDropdown';

import { useAuthContext } from '@/context/AuthContext';

export default function Header() {
  const { user } = useAuthContext();

  return (
    <Navbar className='h-20  border-b-1 border-zinc-200'>
      <div className="flex items-end"> {/* Align items to the bottom */}
        <span className="ml-2 flex items-end text-sm"> {/* Space after the image */}
          与你的角色对话
        </span>
      </div>
      <NavbarContent justify='end' className="h-full flex items-center">
        <NavbarItem>
          {user == null ? <SignIn /> : <UserDropdown user={user} />}
        </NavbarItem>
      </NavbarContent>
    </Navbar>
  );
}
