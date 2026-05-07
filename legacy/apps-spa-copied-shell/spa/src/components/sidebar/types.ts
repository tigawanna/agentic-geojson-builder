export type SidebarItem = {
  title: string;
  href: string;
  icon?: React.ComponentType<any>;
  isActive?: boolean;
  sublinks?: SidebarItem[];
};
