import Link from "next/link";
import { PageContainer } from "@/components/layout/page-container";

export const Footer = () => {
  return (
    <PageContainer>
      <div className="my-4 flex flex-col items-center justify-between px-4 pt-8 md:flex-row">
        <p className="text-footer-link text-sm">
          ©2025 Ahn Ming Loke.
        </p>
        <div className="mt-4 flex items-center gap-4 md:mt-0">
          <Link
            href="https://twitter.com/lokeam"
            className="text-footer-link transition-colors hover:text-gray-900"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z" />
            </svg>
          </Link>
          <Link
            href="https://www.linkedin.com/in/ahnmingloke/"
            className="text-footer-link transition-colors hover:text-gray-900"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
              <rect width="4" height="12" x="2" y="9" />
              <circle cx="4" cy="4" r="2" />
            </svg>
          </Link>
        </div>
      </div>
    </PageContainer>
  );
};