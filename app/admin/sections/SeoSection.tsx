"use client";
import React from "react";
import { SEO_PAGES } from "@/app/lib/seo/pages";
import { blogPosts } from "@/app/lib/blog/posts";
import { siteConfig } from "@/app/lib/seo/site-config";
import { Section, SectionTitle, TableWrap, Table, Th, Td } from "@/app/admin/adminStyles";

// Лише перегляд - показує description, вже заданий у коді для кожної сторінки
// (buildMetadata у app/**/page.tsx) та для кожної статті блогу. Існуючий
// функціонал генерації метаданих не змінюється, це окрема довідкова копія.
export const SeoSection: React.FC = () => {
    return (
        <>
            <Section>
                <SectionTitle>Загальні SEO-налаштування сайту</SectionTitle>
                <TableWrap>
                    <Table>
                        <tbody>
                            <tr>
                                <Th as="td" style={{ width: 160 }}>Назва сайту</Th>
                                <Td>{siteConfig.name}</Td>
                            </tr>
                            <tr>
                                <Th as="td">Опис за замовчуванням</Th>
                                <Td style={{ whiteSpace: "normal" }}>{siteConfig.description}</Td>
                            </tr>
                            <tr>
                                <Th as="td">Ключові слова</Th>
                                <Td style={{ whiteSpace: "normal" }}>{siteConfig.keywords.join(", ")}</Td>
                            </tr>
                        </tbody>
                    </Table>
                </TableWrap>
            </Section>

            <Section>
                <SectionTitle>Сторінки сайту ({SEO_PAGES.length})</SectionTitle>
                <TableWrap>
                    <Table>
                        <thead>
                            <tr>
                                <Th>Шлях</Th>
                                <Th>Title</Th>
                                <Th>Description</Th>
                            </tr>
                        </thead>
                        <tbody>
                            {SEO_PAGES.map((page) => (
                                <tr key={page.path}>
                                    <Td>{page.path}</Td>
                                    <Td style={{ whiteSpace: "normal", minWidth: 200 }}>{page.title}</Td>
                                    <Td style={{ whiteSpace: "normal", minWidth: 280 }}>{page.description}</Td>
                                </tr>
                            ))}
                        </tbody>
                    </Table>
                </TableWrap>
            </Section>

            <Section>
                <SectionTitle>Статті блогу ({blogPosts.length})</SectionTitle>
                <TableWrap>
                    <Table>
                        <thead>
                            <tr>
                                <Th>Шлях</Th>
                                <Th>Title</Th>
                                <Th>Description</Th>
                            </tr>
                        </thead>
                        <tbody>
                            {blogPosts.map((post) => (
                                <tr key={post.slug}>
                                    <Td>/blog/{post.slug}</Td>
                                    <Td style={{ whiteSpace: "normal", minWidth: 200 }}>{post.title}</Td>
                                    <Td style={{ whiteSpace: "normal", minWidth: 280 }}>{post.description}</Td>
                                </tr>
                            ))}
                        </tbody>
                    </Table>
                </TableWrap>
            </Section>
        </>
    );
};
