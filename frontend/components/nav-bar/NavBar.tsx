'use client';

import React, { useState } from 'react';
import Link from 'next/link';

// Components
import { PageContainer } from '@/components/layout/page-container'


// Icons
import { BankIcon } from '@/components/ui/icons/BankIcon';
import { CircleQuestionMarkIcon } from '@/components/ui/icons/CircleQuestionMarkIcon';
import { AvatarIcon } from '@/components/ui/icons/AvatarIcon';


const navMenuItems = [
  {
    title: "About",
    href: "/about",
    icon: CircleQuestionMarkIcon
  },
]

const DesktopNav = ({
  items,
}: {
  items: { title: string; href: string; icon: React.ComponentType<{ className?: string }> }[];
}) => {
  return (
    <div className="hidden items-center justify-between px-4 py-4 md:flex">
      {/* Site Logo */}
      <Link href="/" className="flex items-center gap-2">
        <BankIcon className='h-7 w-7'/>
      </Link>

      <div className="flex items-center gap-10">
        {items.map((item) => (
          <div key={item.title} className="flex items-center gap-2">
            <Link
              className="flex items-center gap-2 font-medium text-gray-300 transition duration-200 hover:text-white dark:text-gray-300 dark:hover:text-neutral-300"
              href={item.href}
              key={item.title}
            >
              <item.icon className='h-8 w-8'/>
            </Link>
          </div>
        ))}
        <div className="flex items-center gap-2">
          <Link href="https://github.com/lokeam/tango-charlie" target="_blank">
            <AvatarIcon className='h-8 w-8'/>
          </Link>
        </div>
      </div>
    </div>
  )
}

// Main Nav
export const NavBar = () => {
  return (
    <PageContainer as="nav" className="">
      <DesktopNav items={navMenuItems} />
    </PageContainer>
  )
}

