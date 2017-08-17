-- up
ALTER TABLE messages
ADD room_id integer;

---

-- down
drop table messages;
