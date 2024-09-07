import {
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem
} from '@nextui-org/dropdown';
import { Avatar } from '@nextui-org/avatar';
import { useAppStore } from "@/zustand/store";
import { useEffect } from "react";
import { useRouter } from 'next/navigation';

export default function UserDropdown({ user }) {
  const { setToken, signOut } = useAppStore();
  const router = useRouter();

  useEffect(() => {
    if (user && user.accessToken) {
      setToken(user.accessToken);
    }
  }, [user, setToken]);

  async function handleMenuClick(key) {
    switch(key) {
      case 'profile':
        // 处理个人资料逻辑
        break;
      case 'logout':
        try {
          const { result, error } = await signOut();
          if (error) {
            console.error('Logout error:', error);
            // 可以在这里添加错误提示
          } else if (result) {
            console.log('Logged out successfully');
            router.push('/login'); // 或者您希望重定向到的页面
          }
        } catch (error) {
          console.error('Unexpected error during logout:', error);
        }
        break;
      default:
        break;
    }
  }

  return (
    <Dropdown placement="bottom-end">
      <DropdownTrigger aria-label="Dropdown trigger">
        <Avatar
          as="button"
          name={user.displayName}
          src={user.photoURL}
        />
      </DropdownTrigger>
      <DropdownMenu
        aria-label="Profile Actions"
        variant="flat"
        onAction={handleMenuClick}>
        <DropdownItem key="profile" className="h-14 gap-2">
          <p className="">Signed in as</p>
          <p className="">{user.email}</p>
        </DropdownItem>
        <DropdownItem key="logout" color="danger">Log Out</DropdownItem>
      </DropdownMenu>
    </Dropdown>
  );
}
