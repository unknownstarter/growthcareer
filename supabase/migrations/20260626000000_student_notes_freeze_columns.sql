-- Sage CRIT-5 fix (B0044) — student_notes 의 immutable 컬럼 강제 trigger.
--
-- 위협: instructor 가 anon-key client 로 직접 UPDATE 시 RLS 의 with check
-- (`author_id = auth.uid()`) 가 강제하는 건 author_id 동결만. student_id /
-- author_role 은 변경 가능 → 다른 학생에 노트 이전 / role escalation 가능.
--
-- 해결: BEFORE UPDATE trigger 로 student_id / author_id / author_role 3 컬럼 동결.
-- 1차 가드 (server action zod schema) + 2차 가드 (RLS with check) + 3차 가드 (trigger).

create or replace function public.student_notes_freeze_columns()
returns trigger as $$
begin
  if NEW.student_id is distinct from OLD.student_id then
    raise exception 'student_notes.student_id is immutable (use delete + insert)';
  end if;
  if NEW.author_id is distinct from OLD.author_id then
    raise exception 'student_notes.author_id is immutable';
  end if;
  if NEW.author_role is distinct from OLD.author_role then
    raise exception 'student_notes.author_role is immutable (snapshot at create)';
  end if;
  return NEW;
end;
$$ language plpgsql;

drop trigger if exists student_notes_freeze_columns_trg on public.student_notes;
create trigger student_notes_freeze_columns_trg
  before update on public.student_notes
  for each row execute function public.student_notes_freeze_columns();

comment on function public.student_notes_freeze_columns is
  'B0044 Sage CRIT-5 — student_notes 의 student_id / author_id / author_role 동결. RLS with check 만으로 차단 못 함 (column-level freeze 불가).';
