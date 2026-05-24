import { AppConfig } from "@/utils/system";
import { Link, useLocation } from "@tanstack/react-router";
import { Github, Mail, Twitter } from "lucide-react";

export function Footer() {
  const currentYear = new Date().getFullYear();
  const { pathname } = useLocation();

  return (
    <footer className="bg-base-200 text-base-content">
      <div className="px-4 py-8 sm:px-6 md:px-10 md:py-12">
        <div className="mx-auto max-w-7xl">
          <div className="mb-8 grid grid-cols-1 gap-8 md:grid-cols-3 md:gap-6">
            <div className="flex flex-col items-center gap-3 text-center md:items-start md:text-left">
              {(() => {
                const Icon = AppConfig.icon as any;
                return <Icon className="size-10 text-primary md:size-12" />;
              })()}
              <div>
                <h3 className="text-lg font-bold md:text-xl">{AppConfig.name}</h3>
                <p className="max-w-xs text-xs leading-relaxed text-base-content/70 md:text-sm">
                  {AppConfig.brief}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-center gap-3">
              <a
                href={AppConfig.links.github}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-square btn-ghost btn-sm md:btn-md"
                aria-label="GitHub"
              >
                <Github className="size-5" />
              </a>
              <a
                href="https://twitter.com"
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-square btn-ghost btn-sm md:btn-md"
                aria-label="Twitter"
              >
                <Twitter className="size-5" />
              </a>
              <a
                href={AppConfig.links.mail}
                className="btn btn-square btn-ghost btn-sm md:btn-md"
                aria-label="Email"
              >
                <Mail className="size-5" />
              </a>
            </div>

            <nav aria-label="footer-navigation" className="flex justify-center md:justify-end">
              <ul className="flex flex-col items-center gap-2 text-sm md:items-end md:text-base">
                <li>
                  <Link to="/" className="link link-hover">
                    Home
                  </Link>
                </li>
                <li>
                  <Link to="/dashboard" className="link link-hover">
                    Dashboard
                  </Link>
                </li>
                <li>
                  <Link to="/auth" search={{ returnTo: pathname }} className="link link-hover">
                    Sign In
                  </Link>
                </li>
              </ul>
            </nav>
          </div>

          {/* Divider */}
          <div className="divider my-0" />

          {/* Copyright */}
          <div className="py-4 text-center text-xs text-base-content/60 md:text-sm">
            <p>
              Copyright © {currentYear} {AppConfig.name}. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
