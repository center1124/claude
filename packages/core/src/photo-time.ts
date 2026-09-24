import { addDays, todayISO } from "./date";
import { TIMELINE_START, toHHMM } from "./time";
import type { HHMM, ISODate } from "./types";

/**
 * JPEG의 EXIF에서 촬영 시각(DateTimeOriginal, 없으면 DateTime)을 읽는다.
 * EXIF 시각은 시간대 정보 없이 찍은 기기의 현지 시각이므로 현지 Date로 만든다.
 */
export function readExifDate(buffer: ArrayBuffer): Date | null {
  const view = new DataView(buffer);
  if (view.byteLength < 4 || view.getUint16(0) !== 0xffd8) return null;

  let offset = 2;
  while (offset + 4 <= view.byteLength) {
    const marker = view.getUint16(offset);
    const size = view.getUint16(offset + 2);
    if (marker === 0xffe1 && view.getUint32(offset + 4) === 0x45786966 /* "Exif" */) {
      return readTiff(view, offset + 10);
    }
    if ((marker & 0xff00) !== 0xff00 || marker === 0xffda) return null;
    offset += 2 + size;
  }
  return null;
}

function readTiff(view: DataView, tiff: number): Date | null {
  const little = view.getUint16(tiff) === 0x4949;
  const u16 = (o: number) => view.getUint16(o, little);
  const u32 = (o: number) => view.getUint32(o, little);

  const entries = (ifd: number) =>
    Array.from({ length: u16(ifd) }, (_, i) => {
      const e = ifd + 2 + i * 12;
      return { tag: u16(e), count: u32(e + 4), value: e + 8 };
    });

  const ifd0 = tiff + u32(tiff + 4);
  const ifd0Entries = entries(ifd0);
  const exifPointer = ifd0Entries.find((e) => e.tag === 0x8769);
  const exifEntries = exifPointer ? entries(tiff + u32(exifPointer.value)) : [];

  const entry = exifEntries.find((e) => e.tag === 0x9003) ?? ifd0Entries.find((e) => e.tag === 0x0132);
  if (!entry || entry.count < 19) return null;
  const start = tiff + u32(entry.value);
  if (start + 19 > view.byteLength) return null;
  const text = String.fromCharCode(...new Uint8Array(view.buffer, view.byteOffset + start, 19));

  const m = /^(\d{4}):(\d{2}):(\d{2}) (\d{2}):(\d{2}):(\d{2})$/.exec(text);
  if (!m) return null;
  const [, y, mo, d, h, mi, s] = m.map(Number);
  return new Date(y, mo - 1, d, h, mi, s);
}

/**
 * 사진 찍은 시각이 이 날짜 기록의 타임라인(06:00 ~ 다음 날 새벽) 안이면 식사 시각으로 쓴다.
 * 다른 날 찍은 사진이면 null.
 */
export function mealTimeFromPhoto(takenAt: Date, logDate: ISODate): HHMM | null {
  const day = todayISO(takenAt);
  const minutes = takenAt.getHours() * 60 + takenAt.getMinutes();
  const sameDay = day === logDate && minutes >= TIMELINE_START;
  const lateNight = day === addDays(logDate, 1) && minutes < TIMELINE_START;
  return sameDay || lateNight ? toHHMM(minutes) : null;
}
