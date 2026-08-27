-- ============================================================================
--  Stat Room Borrowing — Supabase schema (Phase 2)
--  เพิ่มสิทธิ์ "เขียน" (ยืม/คืน/แก้ไข/ลบ) + เปิด Realtime ให้ซิงก์ข้ามเครื่อง
--  วิธีใช้: Supabase Dashboard → SQL Editor → New query → วางทั้งไฟล์ → Run
--  ปลอดภัยที่จะรันซ้ำ (drop policy if exists / DO block กัน error)
--
--  หมายเหตุความปลอดภัย:
--    Phase นี้เปิดให้ anon (คนทั่วไปที่เปิดเว็บ) เขียนได้เต็มที่ เพราะเป็น
--    ระบบยืม-คืนภายในชมรม ไม่มีล็อกอิน ใครเปิดเว็บก็ยืม/คืนได้ตามดีไซน์
--    ความเสี่ยง: ถ้ามีคนรู้ URL + anon key อาจยิงข้อมูลมั่วได้
--    ป้องกันเบื้องต้น: อย่าประกาศ URL สู่สาธารณะ, เก็บ service_role key ไว้เป็นความลับเสมอ
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1) Write policies สำหรับ inventory (คลังอุปกรณ์)
--    อนุญาต insert / update / delete ให้ anon + authenticated
-- ---------------------------------------------------------------------------
drop policy if exists "inventory insert" on public.inventory;
drop policy if exists "inventory update" on public.inventory;
drop policy if exists "inventory delete" on public.inventory;

create policy "inventory insert" on public.inventory
  for insert with check (true);
create policy "inventory update" on public.inventory
  for update using (true) with check (true);
create policy "inventory delete" on public.inventory
  for delete using (true);

-- ---------------------------------------------------------------------------
-- 2) Write policies สำหรับ borrow_logs (ประวัติยืม-คืน)
-- ---------------------------------------------------------------------------
drop policy if exists "borrow_logs insert" on public.borrow_logs;
drop policy if exists "borrow_logs update" on public.borrow_logs;
drop policy if exists "borrow_logs delete" on public.borrow_logs;

create policy "borrow_logs insert" on public.borrow_logs
  for insert with check (true);
create policy "borrow_logs update" on public.borrow_logs
  for update using (true) with check (true);
create policy "borrow_logs delete" on public.borrow_logs
  for delete using (true);

-- ---------------------------------------------------------------------------
-- 3) เปิด Realtime — เพิ่ม 2 ตารางเข้า publication ชื่อ supabase_realtime
--    ใช้ DO block กัน error กรณีตารางถูกเพิ่มไว้แล้ว (รันซ้ำได้)
-- ---------------------------------------------------------------------------
do $$
begin
  begin
    alter publication supabase_realtime add table public.inventory;
  exception when duplicate_object then null;
  end;
  begin
    alter publication supabase_realtime add table public.borrow_logs;
  exception when duplicate_object then null;
  end;
end $$;

-- ---------------------------------------------------------------------------
-- 4) ให้ Realtime ส่งค่าแถวเดิม (old row) ตอน update/delete ครบทุกคอลัมน์
--    ช่วยให้ฝั่งเว็บ merge/refetch ได้แม่นยำขึ้น
-- ---------------------------------------------------------------------------
alter table public.inventory   replica identity full;
alter table public.borrow_logs replica identity full;

-- เสร็จ Phase 2 — กลับไปบอก Claude ว่า "รันแล้ว" เพื่อทดสอบยืม/คืน + realtime จริง
