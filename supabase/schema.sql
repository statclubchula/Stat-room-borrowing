-- ============================================================================
--  Stat Room Borrowing — Supabase schema (Phase 1)
--  วิธีใช้: Supabase Dashboard → SQL Editor → New query → วางทั้งไฟล์ → Run
--  ปลอดภัยที่จะรันซ้ำ (ใช้ IF NOT EXISTS / ON CONFLICT ทุกจุด)
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1) ตารางคลังอุปกรณ์ (inventory)
-- ---------------------------------------------------------------------------
create table if not exists public.inventory (
  id                 text primary key,
  name               text    not null,
  category           text    not null
                       check (category in ('Equipment','Circulating','Non-circulating')),
  total_quantity     integer not null check (total_quantity >= 0),
  available_quantity integer not null check (available_quantity >= 0),
  unit               text    not null,
  location           text    not null default '',
  photo_url          text    default '',          -- รูป "ตัวอุปกรณ์/ที่เก็บ" (ไม่เกี่ยวกับรูปหลักฐานยืม)
  last_updated       date    not null default current_date
);

-- ---------------------------------------------------------------------------
-- 2) ตารางประวัติยืม-คืน (borrow_logs)
--    หมายเหตุ: ไม่มีคอลัมน์รูปหลักฐาน เพราะรูปผู้ยืมส่งเข้า LINE OA เอง
-- ---------------------------------------------------------------------------
create table if not exists public.borrow_logs (
  id                   uuid primary key default gen_random_uuid(),
  item_id              text references public.inventory(id) on delete set null,
  item_name            text    not null,          -- snapshot ชื่อ ณ ตอนยืม
  borrower_name        text    not null,          -- ชื่อเล่น
  year                 text    not null,          -- ชั้นปี
  major                text    not null,          -- ภาค/สาขา
  contact              text    not null,          -- ช่องทางติดต่อ
  quantity             integer not null check (quantity > 0),
  unit                 text    not null,
  borrow_date          date    not null default current_date,
  expected_return_date date,                       -- เฉพาะของที่ต้องคืน
  actual_return_date   date,
  status               text    not null default 'Borrowed'
                         check (status in ('Borrowed','Returned')),
  created_at           timestamptz not null default now()
);

create index if not exists borrow_logs_status_idx on public.borrow_logs(status);
create index if not exists borrow_logs_item_idx   on public.borrow_logs(item_id);

-- ---------------------------------------------------------------------------
-- 3) เปิด Row Level Security (RLS)
--    Phase 1: อนุญาต "อ่าน" ได้ทั่วไปก่อน (ให้หน้าเว็บดึงข้อมูลได้)
--    สิทธิ์ "เขียน" (ยืม/คืน/แก้ไข) จะตั้งให้ครบตอน Phase 2 พร้อมทดสอบจริง
-- ---------------------------------------------------------------------------
alter table public.inventory   enable row level security;
alter table public.borrow_logs enable row level security;

drop policy if exists "inventory read"   on public.inventory;
drop policy if exists "borrow_logs read" on public.borrow_logs;

create policy "inventory read"   on public.inventory   for select using (true);
create policy "borrow_logs read" on public.borrow_logs for select using (true);

-- ---------------------------------------------------------------------------
-- 4) ข้อมูลตั้งต้น (seed) — ตรงกับที่แอปใช้อยู่ตอนนี้
-- ---------------------------------------------------------------------------
insert into public.inventory
  (id, name, category, total_quantity, available_quantity, unit, location, last_updated)
values
  ('itm-001','เครื่องคิดเลขวิทยาศาสตร์ Casio fx-991','Equipment',15,12,'เครื่อง','ตู้ A ชั้น 1','2026-07-28'),
  ('itm-002','โน้ตบุ๊กสำหรับยืม','Equipment',4,2,'เครื่อง','ตู้เก็บอุปกรณ์ (ล็อกกุญแจ)','2026-08-01'),
  ('itm-003','โปรเจกเตอร์พกพา','Equipment',2,2,'เครื่อง','ชั้นวางหลังห้อง','2026-07-15'),
  ('itm-004','สาย HDMI (3 เมตร)','Equipment',6,5,'เส้น','กล่องอุปกรณ์ไฟฟ้า','2026-07-20'),
  ('itm-005','ปลั๊กพ่วง 5 ช่อง','Equipment',5,4,'อัน','ตู้ B ชั้น 2','2026-07-30'),
  ('itm-006','ไมโครโฟนไร้สาย','Equipment',3,0,'ตัว','ตู้อุปกรณ์เสียง','2026-06-29'),
  ('itm-007','กระดาษ A4 (80 แกรม)','Non-circulating',40,33,'รีม','ตู้เก็บวัสดุ ชั้น 3','2026-08-02'),
  ('itm-008','ปากกาไวท์บอร์ด','Non-circulating',60,41,'ด้าม','ลิ้นชักโต๊ะกลาง','2026-07-27'),
  ('itm-009','กระดาษโพสต์อิท','Non-circulating',30,18,'แพ็ก','ลิ้นชักโต๊ะกลาง','2026-07-22'),
  ('itm-010','ถ่าน AA (แพ็ก 4 ก้อน)','Non-circulating',20,4,'แพ็ก','กล่องอุปกรณ์ไฟฟ้า','2026-08-03')
on conflict (id) do nothing;

-- เสร็จ Phase 1 — กลับไปบอก Claude ว่า "รันแล้ว" พร้อมส่ง Project URL + anon key ต่อได้เลย
