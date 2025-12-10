import React from 'react';
import { useNavigate } from 'react-router-dom';
import { View } from '../types';

// View enum과 URL 경로 매핑
const viewToPath: Record<View, string> = {
  [View.RECORD]: '/record',
  [View.CALENDAR]: '/calendar',
  [View.GROUPS]: '/groups',
  [View.BOARD]: '/board',
  [View.PROFILE]: '/profile',
  [View.SETTINGS]: '/settings',
};

interface NavItemProps {
  label: string;
  view: View;
  currentView: View;
  children: React.ReactNode;
}

const NavItem: React.FC<NavItemProps> = ({ label, view, currentView, children }) => {
  const navigate = useNavigate();
  const isActive = currentView === view;
  const activeClasses = 'text-purple-600 dark:text-purple-400';
  const inactiveClasses = 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white';

  const handleClick = () => {
    navigate(viewToPath[view]);
  };

  return (
    <button
      onClick={handleClick}
      className={`flex flex-col items-center justify-center w-full pt-2 pb-1 transition-colors duration-200 ${isActive ? activeClasses : inactiveClasses}`}
    >
      {children}
      <span className="text-xs mt-1">{label}</span>
    </button>
  );
};

interface BottomNavBarProps {
  currentView: View;
}

const BottomNavBar: React.FC<BottomNavBarProps> = ({ currentView }) => {
  return (
    <nav className="fixed bottom-0 left-0 right-0 h-16 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-t border-gray-200 dark:border-gray-700 flex justify-around items-center z-40 md:hidden">
      <NavItem label="기록" view={View.RECORD} currentView={currentView}>
        <MicrophoneIcon />
      </NavItem>
      <NavItem label="연습이력" view={View.CALENDAR} currentView={currentView}>
        <CalendarIcon />
      </NavItem>
      <NavItem label="그룹" view={View.GROUPS} currentView={currentView}>
        <GroupsIcon />
      </NavItem>
      <NavItem label="게시판" view={View.BOARD} currentView={currentView}>
        <BoardIcon />
      </NavItem>
      <NavItem label="설정" view={View.SETTINGS} currentView={currentView}>
        <SettingsIcon />
      </NavItem>
    </nav>
  );
};

// SVG Icons
const MicrophoneIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
  </svg>
);
const CalendarIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
);
const GroupsIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
  </svg>
);
const BoardIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
  </svg>
);
const SettingsIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

export default BottomNavBar;