"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { createDreamSession, matchRequestSchema, matchResponseSchema, type MatchRequest } from "@/domain/dream-session";
import { writeDreamSession } from "@/domain/dream-session/storage";
import "./wish-input.css";

export function WishInput({ onReturn }: { onReturn: () => void }) {
  const router = useRouter();
  const { register, handleSubmit, setError, formState: { errors, isSubmitting } } = useForm<MatchRequest>({ resolver: zodResolver(matchRequestSchema), defaultValues: { wish: "" } });
  const submit = handleSubmit(async (values) => {
    try {
      const response = await fetch("/api/dream/match", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(values) });
      if (!response.ok) throw new Error(`match:${response.status}`);
      const match = matchResponseSchema.parse(await response.json());
      writeDreamSession(createDreamSession(values.wish, match));
      router.push(`/dream/${encodeURIComponent(match.cardId)}`);
    } catch {
      setError("root", { message: "山雾暂未回应，请稍后再试。" });
    }
  });
  return <main className="wish-page"><form className="wish-form" onSubmit={submit}><span>门 后 · 问 愿</span><h1>你想为哪件事寻一条路？</h1><p>愿望只用于匹配一张现有幻梦卡。选中后，七幕剧情固定，任何 AI 都不能改写。</p><textarea {...register("wish")} autoFocus rows={5} placeholder="例如：我被一个迟迟无法开始的选择困住了……" /><div className="wish-error" role="alert">{errors.wish?.message ?? errors.root?.message}</div><button type="submit" disabled={isSubmitting}>{isSubmitting ? "正在问路" : "请 幻 梦"}</button><button className="wish-return" type="button" onClick={onReturn}>返回山门</button></form></main>;
}
