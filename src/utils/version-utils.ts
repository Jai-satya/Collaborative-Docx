import { supabase } from "@/integrations/supabase/client";

function countWords(html: string): number {
  const text = html.replace(/<[^>]*>/g, " ").trim();
  return text ? text.split(/\s+/).length : 0;
}

export async function snapshotVersion(documentId: string, content: string) {
  if (!content || content === "<p></p>") return;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  // Check if latest version already has same content
  const { data: latest } = await supabase
    .from("document_versions")
    .select("content")
    .eq("document_id", documentId)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (latest?.content === content) return;

  const plainText = content.replace(/<[^>]*>/g, "");
  await supabase.from("document_versions").insert({
    document_id: documentId,
    content,
    word_count: countWords(content),
    char_count: plainText.length,
    created_by: user.id,
  });
}
