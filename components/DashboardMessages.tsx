"use client";

import Link from "next/link";
import { MessageSquare, Send, UserCheck } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  masterFollowStorageKey,
  masterMessageStorageKey,
  type MasterMessage,
} from "@/lib/availability";
import { getMasterById } from "@/lib/masters";

const currentMasterId = "andrii-koval";

function formatMessageTime(value: string) {
  return new Intl.DateTimeFormat("uk-UA", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function DashboardMessages() {
  const [messages, setMessages] = useState<MasterMessage[]>([]);
  const [followedMasters, setFollowedMasters] = useState<string[]>([]);
  const [activeMasterId, setActiveMasterId] = useState("");

  useEffect(() => {
    const loadMessages = window.setTimeout(() => {
      const storedMessages = JSON.parse(
        localStorage.getItem(masterMessageStorageKey) ?? "[]",
      ) as MasterMessage[];
      const storedFollows = JSON.parse(
        localStorage.getItem(masterFollowStorageKey) ?? "[]",
      ) as string[];

      setMessages(storedMessages);
      setFollowedMasters(storedFollows);
    }, 0);

    return () => window.clearTimeout(loadMessages);
  }, []);

  const conversations = useMemo(() => {
    const byMaster = new Map<string, MasterMessage[]>();

    messages.forEach((message) => {
      if (
        message.senderMasterId !== currentMasterId &&
        message.recipientMasterId !== currentMasterId
      ) {
        return;
      }

      const counterpartId =
        message.senderMasterId === currentMasterId
          ? message.recipientMasterId
          : message.senderMasterId;

      const thread = byMaster.get(counterpartId) ?? [];
      thread.push(message);
      byMaster.set(counterpartId, thread);
    });

    return Array.from(byMaster.entries())
      .map(([masterId, thread]) => ({
        masterId,
        master: getMasterById(masterId),
        thread: thread.sort(
          (left, right) =>
            new Date(left.createdAt).getTime() -
            new Date(right.createdAt).getTime(),
        ),
      }))
      .sort((left, right) => {
        const leftTime = new Date(left.thread.at(-1)?.createdAt ?? 0).getTime();
        const rightTime = new Date(right.thread.at(-1)?.createdAt ?? 0).getTime();
        return rightTime - leftTime;
      });
  }, [messages]);

  const selectedMasterId = activeMasterId || conversations[0]?.masterId || "";
  const activeConversation =
    conversations.find((conversation) => conversation.masterId === selectedMasterId) ??
    conversations[0];

  const followedProfiles = followedMasters
    .map((masterId) => getMasterById(masterId))
    .filter(Boolean);

  return (
    <section className="dashboard-panel messages-panel">
      <div className="panel-heading">
        <div>
          <p className="dashboard-eyebrow">Повідомлення</p>
          <h2>Переписка з майстрами</h2>
        </div>
        <MessageSquare size={22} aria-hidden="true" />
      </div>

      <div className="followed-strip">
        <span><UserCheck size={15} /> Підписки</span>
        {followedProfiles.length ? (
          followedProfiles.map((master) => (
            <Link
              href={`/profile/${master!.id}?from=dashboard#message-master`}
              key={master!.id}
            >
              {master!.name}
            </Link>
          ))
        ) : (
          <small>Підпишіться на майстра в його профілі.</small>
        )}
      </div>

      {conversations.length ? (
        <div className="messages-layout">
          <div className="conversation-list" aria-label="Список діалогів">
            {conversations.map(({ masterId, master, thread }) => {
              const latest = thread.at(-1);

              return (
                <button
                  className={masterId === activeConversation?.masterId ? "active" : ""}
                  type="button"
                  key={masterId}
                  onClick={() => setActiveMasterId(masterId)}
                >
                  <span className={`conversation-avatar avatar-${master?.accent ?? "blue"}`}>
                    {master?.initials ?? "М"}
                  </span>
                  <span>
                    <strong>{master?.name ?? "Майстер"}</strong>
                    <small>{latest?.subject}</small>
                  </span>
                </button>
              );
            })}
          </div>

          <div className="conversation-thread">
            <div className="conversation-thread-head">
              <div>
                <strong>{activeConversation?.master?.name ?? "Майстер"}</strong>
                <span>{activeConversation?.master?.profession}</span>
              </div>
              {activeConversation && (
                <Link href={`/profile/${activeConversation.masterId}?from=dashboard#message-master`}>
                  Відкрити профіль
                </Link>
              )}
            </div>

            <div className="conversation-messages">
              {activeConversation?.thread.map((message) => {
                const isSent = message.senderMasterId === currentMasterId;

                return (
                  <article
                    className={isSent ? "message-bubble sent" : "message-bubble"}
                    key={message.id}
                  >
                    <span>{isSent ? <Send size={13} /> : <MessageSquare size={13} />} {isSent ? "Ви" : "Майстер"}</span>
                    <strong>{message.subject}</strong>
                    <p>{message.message}</p>
                    <small>{formatMessageTime(message.createdAt)}</small>
                  </article>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        <div className="messages-empty">
          <MessageSquare size={24} />
          <strong>Поки немає переписки</strong>
          <p>Напишіть майстру з його публічного профілю, і повідомлення з&apos;явиться тут.</p>
          <Link href="/masters?from=dashboard">Перейти до майстрів</Link>
        </div>
      )}
    </section>
  );
}
