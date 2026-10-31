import Link from "@docusaurus/Link";
import Heading from "@theme/Heading";
import type { ReactNode } from "react";
import styles from "./styles.module.css";

type NavCardItem = {
  icon: string;
  title: string;
  description: string;
  href: string;
};

const NavCardList: NavCardItem[] = [
  {
    icon: "🎯",
    title: "ビジネス要求",
    description:
      "システムがなぜ必要かを、ユーザーストーリーで定義するドキュメント群",
    href: "/docs/business-requirements",
  },
  {
    icon: "📋",
    title: "システム要件",
    description:
      "ビジネス要求を満たすために、システムが何を行うかを定義するドキュメント群",
    href: "/docs/system-requirements",
  },
  {
    icon: "🏗️",
    title: "システムデザイン",
    description: "システムの構造や動作を定義するドキュメント群",
    href: "/docs/system-design",
  },
  {
    icon: "📜",
    title: "ADR",
    description: "重要な設計判断を時系列で記録したドキュメント群",
    href: "/docs/adr",
  },
  {
    icon: "📐",
    title: "プロジェクトルール",
    description:
      "プロジェクト全体で遵守すべき原則やガイドラインを定めたドキュメント群",
    href: "/docs/project-rules",
  },
  {
    icon: "⚠️",
    title: "技術的懸念",
    description:
      "将来的に問題になりうる設計上・実装上の懸念事項を記録したドキュメント群",
    href: "/docs/technical-concerns",
  },
];

export default function HomepageNavCards(): ReactNode {
  return (
    <section className={styles.navSection}>
      <div className="container">
        <div className={styles.cardsGrid}>
          {NavCardList.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`card padding--lg ${styles.card}`}
            >
              <Heading as="h2" className={styles.cardTitle}>
                <span className={styles.cardIcon}>{item.icon}</span>
                {item.title}
              </Heading>
              <p className={styles.cardDescription}>{item.description}</p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
