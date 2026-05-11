"use client";

import React from "react";
import Image from "next/image";
import { useGoogleAuth } from "@/hooks/useGoogleAuth";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { LogIn, LogOut } from "lucide-react";

interface GoogleSignInButtonProps {
  btnCls: string;
  icoSize: string;
}

export function GoogleSignInButton({ btnCls, icoSize }: GoogleSignInButtonProps) {
  const { user, signIn, signOut, enabled } = useGoogleAuth();

  if (!enabled) return null;

  if (!user) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            onClick={signIn}
            className={`${btnCls} hover:bg-accent hover:text-accent-foreground`}
          >
            <LogIn className={icoSize} />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="right" sideOffset={10}>
          <p className="font-medium">Sign in with Google</p>
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <DropdownMenu>
      <Tooltip>
        <TooltipTrigger asChild>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className={`${btnCls} hover:bg-accent p-0.5 overflow-hidden`}
            >
              <Image
                src={user.picture}
                alt={user.name}
                width={36}
                height={36}
                className="rounded-full w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </Button>
          </DropdownMenuTrigger>
        </TooltipTrigger>
        <TooltipContent side="right" sideOffset={10}>
          <p className="font-medium">{user.name}</p>
        </TooltipContent>
      </Tooltip>

      <DropdownMenuContent
        side="right"
        align="start"
        sideOffset={15}
        className="w-52 p-1.5 rounded-xl shadow-2xl border-border bg-background/95 backdrop-blur-xl"
      >
        <DropdownMenuLabel className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-2 py-1">
          Account
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="my-1" />
        <div className="px-2 py-2 flex items-center gap-2.5">
          <Image
            src={user.picture}
            alt={user.name}
            width={32}
            height={32}
            className="rounded-full object-cover shrink-0"
            referrerPolicy="no-referrer"
          />
          <div className="min-w-0">
            <p className="text-sm font-medium truncate">{user.name}</p>
            <p className="text-xs text-muted-foreground truncate">{user.email}</p>
          </div>
        </div>
        <DropdownMenuSeparator className="my-1" />
        <DropdownMenuItem
          onClick={signOut}
          className="flex items-center gap-2 rounded-xl px-2 py-2 cursor-pointer hover:bg-accent text-destructive focus:text-destructive"
        >
          <LogOut className="h-4 w-4" />
          <span className="text-sm font-medium">Sign out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
