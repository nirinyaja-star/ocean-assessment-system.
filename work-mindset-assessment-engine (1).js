/**
 * Candidate Work Behavior & Mindset Assessment — Core Engine v2 (OCEAN-WB-0.2-proto)
 * ================================================================
 * NEW, SEPARATE engine — does not replace or modify assessment-engine.js (v1) or
 * the published ocean.html. This is a standalone v2 that combines:
 *   - Revised OCEAN Big Five item bank (30 items; 7 items replaced to remove
 *     within-dimension construct duplication found when auditing v1 — see
 *     REVISION_NOTES below for exactly what changed and why)
 *   - A new Work Mindset layer (20 items, 5 dimensions x 4 items): Time,
 *     Ownership, Growth, Problem-Solving, Teamwork — measuring the REASONING
 *     behind work decisions (the WHY), as a distinct layer from OCEAN (the HOW).
 *
 * Decision-support tool for recruiters/managers. Produces OBSERVATIONS backed by
 * traceable evidence — NEVER scores, percentages, rankings, or hire/reject calls.
 * Prototype — not psychometrically validated. Revising the original item bank
 * means ANY validity claim about the original standardized items no longer
 * applies directly; this item bank needs its own Expert Review + Pilot cycle.
 *
 * HARD RULES — identical to v1, do not violate when extending this file:
 *   - Never compute or expose a total score, percentage, fit rating, or ranking.
 *   - Never emit hire/reject, pass/fail, or high/medium/low labels.
 *   - Every behavioral or mindset claim must cite the question number(s) and the
 *     literal option text selected — no claim without evidence.
 *   - OCEAN needs evidence from >=2 DIFFERENT questions before reporting more than
 *     "Explore Further" for a theme (see OCEAN_EVIDENCE_THRESHOLDS).
 *   - Work Mindset results describe REASONING PATTERNS observed, never a score or
 *     a judgment of which pattern is "better" — every pattern is framed as a
 *     trade-off, never a deficiency.
 *   - OCEAN and Work Mindset are reported as two SEPARATE sections — never merged
 *     into one combined score or single narrative that blends personality with
 *     attitude.
 * ================================================================
 */

'use strict';

const ASSESSMENT_VERSION = 'OCEAN-WB-0.2-proto';

/**
 * What changed from v1 and why (full detail; keep in sync with any future edits).
 * Each entry: the question id, the old construct label, the new construct + reason.
 */
const REVISION_NOTES = [
  {
    "id": 11,
    "from": "Learning Approach (duplicated Q1, Q21)",
    "to": "Idea Generation",
    "reason": "Was a near-duplicate of Q1; now measures idea generation, a distinct facet of Openness."
  },
  {
    "id": 21,
    "from": "Learning Approach (duplicated Q1, Q11)",
    "to": "Curiosity Beyond Task",
    "reason": "Was a near-duplicate of Q1/Q11; now measures natural curiosity outside work tasks."
  },
  {
    "id": 26,
    "from": "Adaptability (duplicated Q6)",
    "to": "Openness to Alternative Views",
    "reason": "Was a near-duplicate of Q6; now measures receptiveness to differing viewpoints, an unmeasured facet of Openness."
  },
  {
    "id": 13,
    "from": "Social Initiation (duplicated Q3)",
    "to": "Energy Source",
    "reason": "Was a near-duplicate of Q3; now measures introversion/extraversion via energy recovery style, the core construct of Extraversion."
  },
  {
    "id": 18,
    "from": "Communication Activation (duplicated Q8)",
    "to": "Visibility Preference",
    "reason": "Was a near-duplicate of Q8; now measures preference for public recognition vs low profile."
  },
  {
    "id": 19,
    "from": "Helping Behavior (duplicated Q9, Q29)",
    "to": "Trust in Others' Work",
    "reason": "Was a near-duplicate of Q9; now measures interpersonal trust, a core facet of Agreeableness not previously measured."
  },
  {
    "id": 29,
    "from": "Interpersonal Boundaries (duplicated Q9; also overlapped the new Work Mindset layer)",
    "to": "Benefit of the Doubt",
    "reason": "Original content (time/workload boundaries) now belongs to Work Mindset (Time/Ownership); replaced with a pure Agreeableness construct about interpreting others' mistakes charitably."
  }
];

/** Indicator dictionary — machine key -> Thai behavioral description. Includes 28 new
 * indicators introduced by the 7 revised questions above, alongside the original ones. */
const INDICATORS = {
  "priority_structuring": "จัดลำดับความสำคัญก่อนเริ่ม",
  "quick_completion": "เริ่มจากงานที่เสร็จเร็ว",
  "situational_prioritization": "จัดลำดับตามสถานการณ์เฉพาะหน้า",
  "stakeholder_alignment": "ยืนยัน Priority กับผู้เกี่ยวข้อง",
  "exp_new_method": "ทดลองวิธีใหม่",
  "learn_from_precedent": "เรียนรู้จากตัวอย่างเดิม",
  "seek_guidance": "ขอแนวทางจากผู้มีประสบการณ์",
  "structured_trial": "ทดลองทีละส่วนอย่างมีกรอบ",
  "adapt_fast": "ปรับตัวทันที",
  "info_seeking": "ขอข้อมูลก่อนปรับ",
  "gradual_transition": "เปลี่ยนผ่านแบบค่อยเป็นค่อยไป",
  "alt_proposal": "เสนอทางเลือกอื่น",
  "detail_check": "ตรวจรายละเอียดตามรายการ",
  "risk_based_check": "ตรวจตามจุดเสี่ยง",
  "peer_review": "ให้ผู้อื่นช่วยตรวจ",
  "deadline_first": "ยึดกำหนดเวลาแล้วแก้ภายหลัง",
  "early_voice": "เสนอความเห็นก่อน",
  "observe_first": "สังเกตก่อนพูด",
  "one_to_one": "สื่อสารรายบุคคลภายหลัง",
  "prepared_voice": "เตรียมประเด็นแล้วพูดเมื่อถึงจังหวะ",
  "broadcast_now": "แจ้งทุกคนทันที",
  "summarize_first": "สรุปก่อนแจ้ง",
  "targeted_share": "แจ้งเฉพาะผู้เกี่ยวข้อง",
  "wait_for_forum": "รอเวทีที่เหมาะสม",
  "listen_first": "ฟังให้จบก่อน",
  "advocate_data": "อธิบายข้อมูลของตน",
  "compromise": "หาจุดกึ่งกลาง",
  "escalate_neutral": "ขอผู้ตัดสินกลาง",
  "help_now": "ช่วยทันที",
  "help_later": "ช่วยหลังงานตนเสร็จ",
  "boundary_alt": "บอกข้อจำกัดพร้อมทางเลือก",
  "redirect": "แนะนำผู้อื่นช่วย",
  "feedback_specific": "ขอตัวอย่างเฉพาะแล้วแก้",
  "reflect_first": "ขอเวลาทบทวนก่อนตอบ",
  "clarify_intent": "พูดคุยให้เข้าใจเจตนา",
  "cross_check": "เทียบกับข้อเสนอแนะอื่น",
  "report_early": "แจ้งความผิดพลาดทันที",
  "fix_then_report": "แก้ก่อนแล้วแจ้ง",
  "analyze_cause": "วิเคราะห์สาเหตุก่อน",
  "team_recovery": "ขอทีมช่วยแก้",
  "idea_divergent": "เสนอไอเดียที่แตกต่างจากเดิม",
  "idea_build_on": "ต่อยอดจากไอเดียที่มีอยู่",
  "idea_crowdsource": "รวบรวมไอเดียจากหลายคน",
  "idea_practical": "เลือกไอเดียที่ปฏิบัติได้จริงง่าย",
  "curiosity_broad": "เรียนรู้สิ่งใหม่กว้างๆ ไม่จำกัดหัวข้อ",
  "curiosity_purposeful": "เรียนรู้เฉพาะสิ่งที่เชื่อมกับเป้าหมาย",
  "curiosity_low": "แยกเวลาพักผ่อนจากการเรียนรู้",
  "curiosity_social": "แลกเปลี่ยนความรู้ใหม่กับเพื่อนร่วมงาน",
  "open_adopt": "เปิดรับและลองปรับใช้มุมมองใหม่",
  "open_listen_firm": "รับฟังแต่ยังเชื่อมั่นมุมมองเดิม",
  "open_evidence_seek": "ขอหลักฐานก่อนเปลี่ยนมุมมอง",
  "open_integrate": "หาจุดร่วมระหว่างมุมมองที่ต่างกัน",
  "energy_social": "ฟื้นพลังด้วยการพบปะผู้คน",
  "energy_solo": "ฟื้นพลังด้วยการอยู่คนเดียว",
  "energy_context": "ฟื้นพลังตามสถานการณ์ของวันนั้น",
  "energy_low_key_social": "ฟื้นพลังแบบอยู่ท่ามกลางคนแต่ไม่ต้องพูดคุย",
  "visibility_broad": "ต้องการให้ผลงานเป็นที่รู้จักในวงกว้าง",
  "visibility_targeted": "พอใจให้ผลงานเป็นที่รู้เฉพาะวงที่เกี่ยวข้อง",
  "visibility_indifferent": "ไม่ซีเรียสเรื่องการรับรู้ผลงาน",
  "visibility_upward": "ต้องการให้ผู้บังคับบัญชารับรู้ผลงาน",
  "trust_full": "ไว้ใจให้ผู้อื่นทำงานต่อโดยไม่ตรวจซ้ำ",
  "trust_verify": "ต้องการตรวจสอบก่อนส่งต่องาน",
  "trust_handoff_detail": "อธิบายรายละเอียดครบก่อนส่งต่อ",
  "trust_follow_up": "ติดตามผลเป็นระยะหลังส่งต่องาน",
  "doubt_understanding": "เข้าใจว่าทุกคนมีโอกาสผิดพลาด",
  "doubt_inquire": "อยากรู้สาเหตุก่อนตัดสินความรู้สึก",
  "doubt_internalize": "เก็บความรู้สึกไม่พอใจไว้ภายใน",
  "doubt_direct": "สื่อสารผลกระทบที่เกิดกับตนตรงๆ"
};

/**
 * OCEAN item bank — 30 questions (5 dimensions x 6 items), 23 unchanged from v1 +
 * 7 revised (see REVISION_NOTES). Same forced-choice, 4-option, one-indicator-per-
 * option structure as v1.
 */
const OCEAN_QUESTIONS = [
  {
    "id": 1,
    "dimension": "O",
    "construct": "Learning Approach",
    "text": "เมื่อได้รับงานใหม่ที่ยังไม่มีวิธีดำเนินงานชัดเจน คุณมักจะ…",
    "options": [
      {
        "text": "ลองหาวิธีใหม่ที่ยังไม่เคยใช้",
        "indicator": "exp_new_method"
      },
      {
        "text": "ศึกษาตัวอย่างที่เคยทำสำเร็จก่อน",
        "indicator": "learn_from_precedent"
      },
      {
        "text": "ถามผู้ที่เคยทำเพื่อขอแนวทาง",
        "indicator": "seek_guidance"
      },
      {
        "text": "แบ่งงานเป็นส่วนเล็กแล้วทดลองทีละส่วน",
        "indicator": "structured_trial"
      }
    ]
  },
  {
    "id": 2,
    "dimension": "C",
    "construct": "Work Organization",
    "text": "เมื่อมีหลายงานเข้ามาพร้อมกัน คุณมักจะ…",
    "options": [
      {
        "text": "จัดลำดับความสำคัญก่อนเริ่ม",
        "indicator": "priority_structuring"
      },
      {
        "text": "เริ่มจากงานที่ทำเสร็จได้เร็ว",
        "indicator": "quick_completion"
      },
      {
        "text": "ประเมินตามสถานการณ์เร่งด่วนขณะนั้น",
        "indicator": "situational_prioritization"
      },
      {
        "text": "ประสานผู้เกี่ยวข้องเพื่อยืนยัน Priority",
        "indicator": "stakeholder_alignment"
      }
    ]
  },
  {
    "id": 3,
    "dimension": "E",
    "construct": "Social Initiation",
    "text": "ในการประชุมกับทีมที่ยังไม่คุ้นเคย คุณมักจะ…",
    "options": [
      {
        "text": "เสนอความเห็นเป็นคนแรกๆ",
        "indicator": "early_voice"
      },
      {
        "text": "ฟังและสังเกตก่อน แล้วค่อยพูด",
        "indicator": "observe_first"
      },
      {
        "text": "ไปคุยรายบุคคลหลังประชุม",
        "indicator": "one_to_one"
      },
      {
        "text": "เตรียมประเด็นไว้ แล้วพูดเมื่อถึงจังหวะ",
        "indicator": "prepared_voice"
      }
    ]
  },
  {
    "id": 4,
    "dimension": "A",
    "construct": "Conflict Handling",
    "text": "เมื่อเพื่อนร่วมงานเห็นต่างจากคุณในประเด็นงาน คุณมักจะ…",
    "options": [
      {
        "text": "ฟังเหตุผลของเขาให้จบก่อน",
        "indicator": "listen_first"
      },
      {
        "text": "อธิบายข้อมูลของตนเพื่อหาข้อสรุป",
        "indicator": "advocate_data"
      },
      {
        "text": "หาจุดกึ่งกลางที่ทั้งสองฝ่ายรับได้",
        "indicator": "compromise"
      },
      {
        "text": "ขอให้บุคคลที่สามช่วยตัดสิน",
        "indicator": "escalate_neutral"
      }
    ]
  },
  {
    "id": 5,
    "dimension": "N",
    "construct": "Feedback Response",
    "text": "เมื่อได้รับข้อเสนอแนะว่างานต้องแก้ไข คุณมักจะ…",
    "options": [
      {
        "text": "ขอตัวอย่างเฉพาะเจาะจงแล้วแก้ทันที",
        "indicator": "feedback_specific"
      },
      {
        "text": "ขอเวลาทบทวนก่อนตอบ",
        "indicator": "reflect_first"
      },
      {
        "text": "พูดคุยเพื่อทำความเข้าใจเจตนา",
        "indicator": "clarify_intent"
      },
      {
        "text": "เทียบกับข้อเสนอแนะอื่นก่อน",
        "indicator": "cross_check"
      }
    ]
  },
  {
    "id": 6,
    "dimension": "O",
    "construct": "Adaptability",
    "text": "เมื่อวิธีทำงานเดิมถูกเปลี่ยนโดยไม่แจ้งล่วงหน้า คุณมักจะ…",
    "options": [
      {
        "text": "ปรับตามทันที",
        "indicator": "adapt_fast"
      },
      {
        "text": "ขอทราบเหตุผลก่อนปรับ",
        "indicator": "info_seeking"
      },
      {
        "text": "ใช้วิธีเดิมควบคู่ไปก่อน",
        "indicator": "gradual_transition"
      },
      {
        "text": "เสนอทางเลือกที่เห็นว่าเหมาะกว่า",
        "indicator": "alt_proposal"
      }
    ]
  },
  {
    "id": 7,
    "dimension": "C",
    "construct": "Detail Management",
    "text": "ก่อนส่งงานสำคัญ คุณมักจะ…",
    "options": [
      {
        "text": "ตรวจทุกรายการตามเช็กลิสต์",
        "indicator": "detail_check"
      },
      {
        "text": "ตรวจเฉพาะจุดที่เสี่ยงผิดพลาด",
        "indicator": "risk_based_check"
      },
      {
        "text": "ให้ผู้อื่นช่วยตรวจอีกรอบ",
        "indicator": "peer_review"
      },
      {
        "text": "ส่งตามกำหนดแล้วแก้ภายหลังหากพบ",
        "indicator": "deadline_first"
      }
    ]
  },
  {
    "id": 8,
    "dimension": "E",
    "construct": "Communication Activation",
    "text": "เมื่อมีข้อมูลที่ทีมควรรับรู้ คุณมักจะ…",
    "options": [
      {
        "text": "แจ้งทุกคนทันที",
        "indicator": "broadcast_now"
      },
      {
        "text": "รวบรวมและสรุปก่อนแจ้ง",
        "indicator": "summarize_first"
      },
      {
        "text": "แจ้งเฉพาะคนที่เกี่ยวข้อง",
        "indicator": "targeted_share"
      },
      {
        "text": "รอเวทีประชุมที่เหมาะสม",
        "indicator": "wait_for_forum"
      }
    ]
  },
  {
    "id": 9,
    "dimension": "A",
    "construct": "Helping & Boundaries",
    "text": "เมื่อถูกขอให้ช่วยงานขณะงานของตนเร่งอยู่ คุณมักจะ…",
    "options": [
      {
        "text": "ช่วยทันที",
        "indicator": "help_now"
      },
      {
        "text": "ช่วยหลังงานตนเองเสร็จ",
        "indicator": "help_later"
      },
      {
        "text": "บอกข้อจำกัดพร้อมเสนอทางเลือก",
        "indicator": "boundary_alt"
      },
      {
        "text": "แนะนำคนอื่นที่ช่วยได้",
        "indicator": "redirect"
      }
    ]
  },
  {
    "id": 10,
    "dimension": "N",
    "construct": "Response to Mistakes",
    "text": "เมื่อพบข้อผิดพลาดใกล้กำหนดส่ง คุณมักจะ…",
    "options": [
      {
        "text": "แจ้งผู้เกี่ยวข้องทันที",
        "indicator": "report_early"
      },
      {
        "text": "แก้ไขก่อนแล้วค่อยแจ้ง",
        "indicator": "fix_then_report"
      },
      {
        "text": "หยุดวิเคราะห์สาเหตุก่อน",
        "indicator": "analyze_cause"
      },
      {
        "text": "ขอให้ทีมช่วยแก้ร่วมกัน",
        "indicator": "team_recovery"
      }
    ]
  },
  {
    "id": 11,
    "dimension": "O",
    "construct": "Idea Generation",
    "text": "เมื่อทีมต้องการไอเดียใหม่ในการแก้ปัญหา คุณมักจะ…",
    "options": [
      {
        "text": "เสนอไอเดียที่แตกต่างจากที่เคยทำมา",
        "indicator": "idea_divergent"
      },
      {
        "text": "ต่อยอดจากไอเดียที่มีอยู่แล้ว",
        "indicator": "idea_build_on"
      },
      {
        "text": "รวบรวมไอเดียจากหลายคนก่อนเลือก",
        "indicator": "idea_crowdsource"
      },
      {
        "text": "เลือกไอเดียที่นำไปปฏิบัติได้จริงง่ายที่สุด",
        "indicator": "idea_practical"
      }
    ]
  },
  {
    "id": 12,
    "dimension": "C",
    "construct": "Planning",
    "text": "เมื่อต้องวางแผนโครงการใหม่ คุณมักจะ…",
    "options": [
      {
        "text": "เขียนแผนและ milestone ก่อนเริ่ม",
        "indicator": "priority_structuring"
      },
      {
        "text": "เริ่มก่อนแล้วปรับแผนระหว่างทาง",
        "indicator": "situational_prioritization"
      },
      {
        "text": "ปรึกษาผู้เกี่ยวข้องเพื่อกำหนดขอบเขตก่อน",
        "indicator": "stakeholder_alignment"
      },
      {
        "text": "แบ่งเป็นช่วงสั้นๆ แล้วทดลองทำ",
        "indicator": "structured_trial"
      }
    ]
  },
  {
    "id": 13,
    "dimension": "E",
    "construct": "Energy Source",
    "text": "หลังวันทำงานที่ยุ่งมาก คุณมักจะรู้สึกว่า…",
    "options": [
      {
        "text": "อยากพบปะพูดคุยกับคนเพื่อคลายเครียด",
        "indicator": "energy_social"
      },
      {
        "text": "อยากอยู่คนเดียวเงียบๆ เพื่อฟื้นพลัง",
        "indicator": "energy_solo"
      },
      {
        "text": "ขึ้นอยู่กับว่าวันนั้นเหนื่อยแค่ไหน",
        "indicator": "energy_context"
      },
      {
        "text": "อยากทำกิจกรรมที่ไม่ต้องคุยกับใคร แต่อยู่ท่ามกลางผู้คนได้ (เช่น นั่งร้านกาแฟคนเดียว)",
        "indicator": "energy_low_key_social"
      }
    ]
  },
  {
    "id": 14,
    "dimension": "A",
    "construct": "Perspective Taking",
    "text": "เมื่อเพื่อนร่วมงานมีแนวคิดต่างจากคุณในที่ประชุม คุณมักจะ…",
    "options": [
      {
        "text": "ถามให้เข้าใจแนวคิดของเขาก่อน",
        "indicator": "listen_first"
      },
      {
        "text": "ยกข้อมูลสนับสนุนแนวคิดของตน",
        "indicator": "advocate_data"
      },
      {
        "text": "ผสมทั้งสองแนวทางเข้าด้วยกัน",
        "indicator": "compromise"
      },
      {
        "text": "ขอให้หัวหน้าช่วยตัดสิน",
        "indicator": "escalate_neutral"
      }
    ]
  },
  {
    "id": 15,
    "dimension": "N",
    "construct": "Response to Uncertainty",
    "text": "เมื่อสถานการณ์งานไม่แน่นอนและข้อมูลไม่ครบ คุณมักจะ…",
    "options": [
      {
        "text": "ขอข้อมูลเพิ่มก่อนเดินหน้า",
        "indicator": "info_seeking"
      },
      {
        "text": "เดินหน้าตามข้อมูลที่มีแล้วปรับ",
        "indicator": "adapt_fast"
      },
      {
        "text": "ปรึกษาทีมก่อนตัดสินใจ",
        "indicator": "team_recovery"
      },
      {
        "text": "วางแผนสำรองไว้ล่วงหน้า",
        "indicator": "risk_based_check"
      }
    ]
  },
  {
    "id": 16,
    "dimension": "O",
    "construct": "Exploration",
    "text": "เมื่อพบปัญหาที่ไม่เคยเจอมาก่อน คุณมักจะ…",
    "options": [
      {
        "text": "ลองแก้ด้วยหลายวิธี",
        "indicator": "exp_new_method"
      },
      {
        "text": "ค้นหาปัญหาที่คล้ายกันจากอดีต",
        "indicator": "learn_from_precedent"
      },
      {
        "text": "ปรึกษาผู้ที่มีความรู้",
        "indicator": "seek_guidance"
      },
      {
        "text": "วิเคราะห์สาเหตุก่อนลงมือ",
        "indicator": "analyze_cause"
      }
    ]
  },
  {
    "id": 17,
    "dimension": "C",
    "construct": "Deadline Management",
    "text": "เมื่อกำหนดส่งใกล้เข้ามาแต่งานยังไม่เสร็จ คุณมักจะ…",
    "options": [
      {
        "text": "เร่งงานที่สำคัญที่สุดก่อน",
        "indicator": "priority_structuring"
      },
      {
        "text": "ทำให้เสร็จเร็วที่สุดเท่าที่ทำได้",
        "indicator": "quick_completion"
      },
      {
        "text": "แจ้งผู้เกี่ยวข้องและตกลงกำหนดใหม่",
        "indicator": "stakeholder_alignment"
      },
      {
        "text": "ส่งเท่าที่ทันแล้วแก้ภายหลัง",
        "indicator": "deadline_first"
      }
    ]
  },
  {
    "id": 18,
    "dimension": "E",
    "construct": "Visibility Preference",
    "text": "คุณรู้สึกสบายใจกว่าเมื่อผลงานของคุณ…",
    "options": [
      {
        "text": "เป็นที่รู้จักในวงกว้าง",
        "indicator": "visibility_broad"
      },
      {
        "text": "เป็นที่รู้ในวงที่เกี่ยวข้องเท่านั้น",
        "indicator": "visibility_targeted"
      },
      {
        "text": "ไม่ซีเรียสว่าใครจะเห็นหรือไม่ ขอให้งานสำเร็จ",
        "indicator": "visibility_indifferent"
      },
      {
        "text": "ให้หัวหน้ารับรู้มากกว่าคนทั่วไป",
        "indicator": "visibility_upward"
      }
    ]
  },
  {
    "id": 19,
    "dimension": "A",
    "construct": "Trust in Others' Work",
    "text": "เมื่อต้องส่งต่องานให้ผู้อื่นทำต่อ คุณมักจะ…",
    "options": [
      {
        "text": "เชื่อว่าเขาจะทำต่อได้ดีโดยไม่ต้องตรวจซ้ำ",
        "indicator": "trust_full"
      },
      {
        "text": "อยากตรวจสอบอีกครั้งก่อนส่งต่อจริง",
        "indicator": "trust_verify"
      },
      {
        "text": "อธิบายรายละเอียดให้ครบก่อนส่งต่อ",
        "indicator": "trust_handoff_detail"
      },
      {
        "text": "ติดตามผลหลังส่งต่อเป็นระยะ",
        "indicator": "trust_follow_up"
      }
    ]
  },
  {
    "id": 20,
    "dimension": "N",
    "construct": "Pressure Management",
    "text": "เมื่อมีงานด่วนแทรกเข้ามากะทันหัน คุณมักจะ…",
    "options": [
      {
        "text": "ปรับลำดับงานทันที",
        "indicator": "situational_prioritization"
      },
      {
        "text": "พักคิดสั้นๆ ก่อนตัดสินใจ",
        "indicator": "reflect_first"
      },
      {
        "text": "ปรึกษาหัวหน้าหรือทีม",
        "indicator": "stakeholder_alignment"
      },
      {
        "text": "ตรวจสอบก่อนว่าเร่งด่วนจริงหรือไม่",
        "indicator": "clarify_intent"
      }
    ]
  },
  {
    "id": 21,
    "dimension": "O",
    "construct": "Curiosity Beyond Task",
    "text": "เมื่อมีเวลาว่างจากงานประจำ คุณมักจะ…",
    "options": [
      {
        "text": "หาความรู้ใหม่ที่ไม่เกี่ยวกับงานเลย",
        "indicator": "curiosity_broad"
      },
      {
        "text": "เลือกอ่าน/เรียนเฉพาะเรื่องที่เชื่อมโยงกับงานในอนาคต",
        "indicator": "curiosity_purposeful"
      },
      {
        "text": "ใช้เวลาพักผ่อนโดยไม่เกี่ยวกับการเรียนรู้",
        "indicator": "curiosity_low"
      },
      {
        "text": "ชวนเพื่อนร่วมงานพูดคุยแลกเปลี่ยนสิ่งที่เพิ่งรู้มา",
        "indicator": "curiosity_social"
      }
    ]
  },
  {
    "id": 22,
    "dimension": "C",
    "construct": "Self-monitoring",
    "text": "เมื่อต้องติดตามงานที่ต้องทำต่อเนื่องหลายสัปดาห์ คุณมักจะ…",
    "options": [
      {
        "text": "ใช้รายการงานและเช็กเป็นประจำ",
        "indicator": "detail_check"
      },
      {
        "text": "ตรวจเฉพาะจุดที่มีความเสี่ยง",
        "indicator": "risk_based_check"
      },
      {
        "text": "ให้ผู้อื่นช่วยเตือนความคืบหน้า",
        "indicator": "peer_review"
      },
      {
        "text": "จัดลำดับใหม่ตามความเร่งด่วน",
        "indicator": "situational_prioritization"
      }
    ]
  },
  {
    "id": 23,
    "dimension": "E",
    "construct": "Expression of Ideas",
    "text": "เมื่อต้องอัปเดตความคืบหน้าให้ผู้บริหาร คุณมักจะ…",
    "options": [
      {
        "text": "แจ้งด้วยวาจาทันที",
        "indicator": "broadcast_now"
      },
      {
        "text": "เขียนสรุปแล้วส่ง",
        "indicator": "summarize_first"
      },
      {
        "text": "รอนัดหมายที่เหมาะสม",
        "indicator": "wait_for_forum"
      },
      {
        "text": "แจ้งเฉพาะประเด็นที่ต้องตัดสินใจ",
        "indicator": "targeted_share"
      }
    ]
  },
  {
    "id": 24,
    "dimension": "A",
    "construct": "Cooperation",
    "text": "เมื่อต้องตกลงงานกับหลายฝ่ายที่ต้องการต่างกัน คุณมักจะ…",
    "options": [
      {
        "text": "ประสานให้ทุกฝ่ายตกลงร่วมกัน",
        "indicator": "stakeholder_alignment"
      },
      {
        "text": "หาข้อตกลงที่ทุกฝ่ายรับได้",
        "indicator": "compromise"
      },
      {
        "text": "ยึดขอบเขตที่กำหนดไว้",
        "indicator": "boundary_alt"
      },
      {
        "text": "ยกเป็นประเด็นให้ผู้ตัดสิน",
        "indicator": "escalate_neutral"
      }
    ]
  },
  {
    "id": 25,
    "dimension": "N",
    "construct": "Recovery Preference",
    "text": "เมื่องานที่ทำไม่ได้ผลตามที่คาดหวัง คุณมักจะ…",
    "options": [
      {
        "text": "วิเคราะห์สาเหตุก่อน",
        "indicator": "analyze_cause"
      },
      {
        "text": "ขอความเห็นจากคนอื่น",
        "indicator": "cross_check"
      },
      {
        "text": "ลองวิธีใหม่ทันที",
        "indicator": "exp_new_method"
      },
      {
        "text": "ขอให้ทีมช่วยทบทวนร่วมกัน",
        "indicator": "team_recovery"
      }
    ]
  },
  {
    "id": 26,
    "dimension": "O",
    "construct": "Openness to Alternative Views",
    "text": "เมื่อมีคนเสนอมุมมองที่ต่างจากที่คุณคุ้นเคยมาก คุณมักจะ…",
    "options": [
      {
        "text": "เปิดรับฟังและลองปรับใช้ดู",
        "indicator": "open_adopt"
      },
      {
        "text": "รับฟังแต่ยังเชื่อมั่นในมุมมองเดิม",
        "indicator": "open_listen_firm"
      },
      {
        "text": "ขอเหตุผล/หลักฐานเพิ่มก่อนตัดสินใจเปลี่ยน",
        "indicator": "open_evidence_seek"
      },
      {
        "text": "ชวนคุยเพื่อหาจุดร่วมระหว่างสองมุมมอง",
        "indicator": "open_integrate"
      }
    ]
  },
  {
    "id": 27,
    "dimension": "C",
    "construct": "Follow-through",
    "text": "เมื่อต้องรับช่วงงานต่อจากผู้อื่น คุณมักจะ…",
    "options": [
      {
        "text": "ตรวจรายละเอียดทั้งหมดก่อน",
        "indicator": "detail_check"
      },
      {
        "text": "ถามผู้ส่งมอบถึงจุดสำคัญ",
        "indicator": "seek_guidance"
      },
      {
        "text": "ตรวจเฉพาะส่วนที่ต้องแก้",
        "indicator": "risk_based_check"
      },
      {
        "text": "เริ่มทำต่อแล้วแก้เมื่อพบปัญหา",
        "indicator": "deadline_first"
      }
    ]
  },
  {
    "id": 28,
    "dimension": "E",
    "construct": "Group Engagement",
    "text": "เมื่อพบปัญหาระหว่างการทำงานร่วมกัน คุณมักจะ…",
    "options": [
      {
        "text": "แจ้งทีมทันที",
        "indicator": "report_early"
      },
      {
        "text": "แก้ก่อนแล้วค่อยแจ้ง",
        "indicator": "fix_then_report"
      },
      {
        "text": "คุยกับคนที่เกี่ยวข้องโดยตรง",
        "indicator": "one_to_one"
      },
      {
        "text": "รอประชุมประจำ",
        "indicator": "wait_for_forum"
      }
    ]
  },
  {
    "id": 29,
    "dimension": "A",
    "construct": "Benefit of the Doubt",
    "text": "เมื่อเพื่อนร่วมงานทำพลาดจนกระทบงานของคุณ คุณมักจะ…",
    "options": [
      {
        "text": "เข้าใจว่าทุกคนมีโอกาสผิดพลาดได้",
        "indicator": "doubt_understanding"
      },
      {
        "text": "อยากรู้สาเหตุก่อนตัดสินใจรู้สึกอย่างไร",
        "indicator": "doubt_inquire"
      },
      {
        "text": "รู้สึกหงุดหงิดแต่ไม่แสดงออก",
        "indicator": "doubt_internalize"
      },
      {
        "text": "พูดตรงๆ ถึงผลกระทบที่เกิดกับตน",
        "indicator": "doubt_direct"
      }
    ]
  },
  {
    "id": 30,
    "dimension": "N",
    "construct": "Emotional Regulation",
    "text": "เมื่อทำงานภายใต้ความกดดันจากผู้บริหารหรือลูกค้า คุณมักจะ…",
    "options": [
      {
        "text": "จัดลำดับสิ่งที่ต้องทำแล้วเริ่มทันที",
        "indicator": "priority_structuring"
      },
      {
        "text": "ขอเวลาสั้นๆ เพื่อตั้งหลัก",
        "indicator": "reflect_first"
      },
      {
        "text": "คุยเพื่อเข้าใจความคาดหวังของเขา",
        "indicator": "clarify_intent"
      },
      {
        "text": "ขอความช่วยเหลือจากทีม",
        "indicator": "team_recovery"
      }
    ]
  }
];

/**
 * Work Mindset item bank — 5 dimensions x 4 situational items = 20 items.
 * Each option carries a `reasoning` key (the underlying logic, not a trait score)
 * and a human-readable `label`. No option is "correct" — every reasoning pattern
 * is a legitimate way to approach the situation.
 */
const MINDSET_DIMENSIONS = {
  "time": {
    "name": "Time Mindset",
    "nameTh": "มุมมองต่อเวลา ความยืดหยุ่น และขอบเขตการทำงาน",
    "questions": [
      {
        "text": "ถึงเวลาเลิกงานแต่ยังมีงานค้างที่ไม่เร่งด่วนมาก คุณมักจะ…",
        "options": [
          {
            "text": "ทำต่อจนกว่าจะรู้สึกว่าเสร็จในระดับที่พอใจ",
            "reasoning": "result_focused",
            "label": "เน้นผลลัพธ์มากกว่ากรอบเวลา"
          },
          {
            "text": "หยุดตามเวลาแล้วทำต่อพรุ่งนี้",
            "reasoning": "boundary_firm",
            "label": "แยกเวลางาน/ส่วนตัวชัดเจน"
          },
          {
            "text": "ประเมินว่างานนั้นเร่งด่วนแค่ไหนก่อนตัดสินใจ",
            "reasoning": "situational",
            "label": "ยืดหยุ่นตามสถานการณ์"
          },
          {
            "text": "ถามหัวหน้า/ทีมว่าจำเป็นต้องทำต่อหรือไม่",
            "reasoning": "collective_decision",
            "label": "อิงการตัดสินใจจากส่วนรวม"
          }
        ]
      },
      {
        "text": "ได้รับมอบหมายงานที่ไม่มีกำหนดเวลาชัดเจน คุณมักจะ…",
        "options": [
          {
            "text": "ตั้งกำหนดเวลาของตัวเองทันที",
            "reasoning": "proactive_framing",
            "label": "ตั้งกรอบเวลาเชิงรุกเอง"
          },
          {
            "text": "รอให้ผู้มอบหมายระบุกำหนดเวลา",
            "reasoning": "wait_external",
            "label": "รอกรอบจากภายนอก"
          },
          {
            "text": "ทำไปตามจังหวะงานอื่นที่มีอยู่",
            "reasoning": "situational",
            "label": "ปรับตามจังหวะงานอื่น"
          },
          {
            "text": "ถามผู้เกี่ยวข้องว่าควรเสร็จเมื่อไหร่",
            "reasoning": "clarify_expectation",
            "label": "ขอความชัดเจนก่อนเริ่ม"
          }
        ]
      },
      {
        "text": "มีประชุมสำคัญเกิดขึ้นกะทันหันนอกเวลางาน คุณมักจะ…",
        "options": [
          {
            "text": "เข้าร่วมทันทีโดยไม่คิดมาก",
            "reasoning": "boundary_flexible",
            "label": "ขอบเขตเวลายืดหยุ่น"
          },
          {
            "text": "เข้าร่วมแต่รู้สึกว่าควรมีการชดเชยเวลา",
            "reasoning": "flexible_reciprocity",
            "label": "ยืดหยุ่นแบบคาดหวังการชดเชย"
          },
          {
            "text": "แจ้งว่าขอเลื่อนไปคุยในเวลางานแทน",
            "reasoning": "boundary_firm",
            "label": "ขอบเขตเวลาที่ชัดเจน"
          },
          {
            "text": "พิจารณาความสำคัญของเรื่องก่อนตัดสินใจ",
            "reasoning": "situational",
            "label": "ตัดสินใจตามความสำคัญของเรื่อง"
          }
        ]
      },
      {
        "text": "เมื่อวางแผนงานประจำสัปดาห์ คุณให้ความสำคัญกับอะไรมากที่สุด…",
        "options": [
          {
            "text": "เสร็จให้เร็วที่สุดเท่าที่ทำได้",
            "reasoning": "speed_focused",
            "label": "เน้นความเร็ว"
          },
          {
            "text": "จัดสรรเวลาให้สมดุลระหว่างงานและพัก",
            "reasoning": "balance_focused",
            "label": "เน้นความสมดุล"
          },
          {
            "text": "เผื่อเวลาสำหรับเรื่องไม่คาดฝัน",
            "reasoning": "buffer_focused",
            "label": "เน้นเผื่อความเสี่ยง"
          },
          {
            "text": "ทำตามลำดับที่ผู้อื่นร้องขอก่อน",
            "reasoning": "responsive_focused",
            "label": "เน้นตอบสนองผู้อื่นก่อน"
          }
        ]
      }
    ]
  },
  "ownership": {
    "name": "Ownership Mindset",
    "nameTh": "มุมมองต่อหน้าที่และความรับผิดชอบ",
    "questions": [
      {
        "text": "เมื่องานที่ทำร่วมกับทีมเกิดผลลัพธ์ไม่ดี คุณมักจะ…",
        "options": [
          {
            "text": "มองว่าเป็นความรับผิดชอบร่วมของทั้งทีม",
            "reasoning": "shared_ownership",
            "label": "มองเป็นความรับผิดชอบร่วม"
          },
          {
            "text": "ทบทวนว่าส่วนของตัวเองทำพลาดตรงไหน",
            "reasoning": "self_accountability",
            "label": "ทบทวนตนเองก่อน"
          },
          {
            "text": "วิเคราะห์ว่าปัจจัยภายนอกมีผลแค่ไหน",
            "reasoning": "contextual_attribution",
            "label": "มองปัจจัยภายนอกประกอบ"
          },
          {
            "text": "ถามทีมว่าควรแก้ไขจุดไหนร่วมกัน",
            "reasoning": "collective_problem_solving",
            "label": "แก้ปัญหาร่วมกับทีม"
          }
        ]
      },
      {
        "text": "พบว่างานที่ไม่ได้อยู่ในหน้าที่ตัวเองโดยตรงกำลังจะมีปัญหา คุณมักจะ…",
        "options": [
          {
            "text": "เข้าไปช่วยแก้ไขทันทีแม้ไม่ใช่หน้าที่",
            "reasoning": "broad_ownership",
            "label": "รับผิดชอบกว้างเกินหน้าที่ตน"
          },
          {
            "text": "แจ้งผู้รับผิดชอบให้ทราบแล้วให้เขาตัดสินใจ",
            "reasoning": "respect_role_boundary",
            "label": "เคารพขอบเขตบทบาทผู้อื่น"
          },
          {
            "text": "ทำเฉพาะเมื่อถูกขอให้ช่วย",
            "reasoning": "wait_to_be_asked",
            "label": "รอการร้องขอก่อน"
          },
          {
            "text": "ประเมินผลกระทบต่องานตัวเองก่อนตัดสินใจเข้าไปช่วย",
            "reasoning": "impact_based",
            "label": "ตัดสินใจตามผลกระทบ"
          }
        ]
      },
      {
        "text": "เมื่อได้รับมอบหมายงานที่ไม่ถนัด คุณมักจะ…",
        "options": [
          {
            "text": "รับและหาทางทำให้สำเร็จด้วยตัวเอง",
            "reasoning": "self_reliant",
            "label": "พึ่งพาตนเองเป็นหลัก"
          },
          {
            "text": "รับแต่ขอคำปรึกษาจากผู้มีประสบการณ์",
            "reasoning": "ownership_with_support",
            "label": "รับผิดชอบพร้อมขอการสนับสนุน"
          },
          {
            "text": "แจ้งข้อจำกัดและเสนอให้ปรับมอบหมาย",
            "reasoning": "boundary_setting",
            "label": "ตั้งขอบเขตความสามารถตนเอง"
          },
          {
            "text": "รับและมองเป็นโอกาสเรียนรู้",
            "reasoning": "growth_oriented",
            "label": "มองเป็นโอกาสเติบโต"
          }
        ]
      },
      {
        "text": "ผลงานของคุณถูกนำไปใช้ต่อโดยผู้อื่นแล้วเกิดปัญหา คุณรู้สึกว่า…",
        "options": [
          {
            "text": "ยังเป็นความรับผิดชอบของคุณในฐานะผู้สร้างต้นทาง",
            "reasoning": "extended_ownership",
            "label": "รับผิดชอบขยายผลถึงปลายทาง"
          },
          {
            "text": "เป็นความรับผิดชอบของผู้ที่นำไปใช้ต่อ",
            "reasoning": "handoff_based",
            "label": "จบความรับผิดชอบที่การส่งมอบ"
          },
          {
            "text": "ขึ้นกับว่าปัญหาที่เกิดมาจากส่วนไหน",
            "reasoning": "outcome_based",
            "label": "พิจารณาตามต้นเหตุของปัญหา"
          },
          {
            "text": "ควรทบทวนร่วมกันทั้งสองฝ่าย",
            "reasoning": "collaborative_accountability",
            "label": "รับผิดชอบร่วมกันทั้งสองฝ่าย"
          }
        ]
      }
    ]
  },
  "growth": {
    "name": "Growth Mindset",
    "nameTh": "ทัศนคติต่อการเรียนรู้และพัฒนาตนเอง",
    "questions": [
      {
        "text": "เมื่อถูกวิจารณ์ผลงานอย่างตรงไปตรงมา คุณมักจะ…",
        "options": [
          {
            "text": "มองเป็นโอกาสในการพัฒนา",
            "reasoning": "growth_framing",
            "label": "มองเป็นโอกาสพัฒนา"
          },
          {
            "text": "รู้สึกไม่สบายใจก่อน แล้วค่อยพิจารณา",
            "reasoning": "emotional_processing_first",
            "label": "ประมวลความรู้สึกก่อน"
          },
          {
            "text": "ประเมินว่าคำวิจารณ์นั้นสมเหตุสมผลแค่ไหนก่อนรับ",
            "reasoning": "critical_evaluation",
            "label": "ประเมินเชิงวิพากษ์ก่อนรับ"
          },
          {
            "text": "ขอตัวอย่างที่ชัดเจนเพื่อเข้าใจประเด็น",
            "reasoning": "clarity_seeking",
            "label": "ต้องการความชัดเจนของประเด็น"
          }
        ]
      },
      {
        "text": "เมื่อเจองานที่ยากเกินความสามารถปัจจุบัน คุณมักจะคิดว่า…",
        "options": [
          {
            "text": "เป็นโอกาสที่จะพัฒนาทักษะใหม่",
            "reasoning": "challenge_as_growth",
            "label": "มองความท้าทายเป็นโอกาสเติบโต"
          },
          {
            "text": "ต้องหาผู้ช่วยหรือทรัพยากรเพิ่ม",
            "reasoning": "resource_seeking",
            "label": "แสวงหาทรัพยากรเพิ่มเติม"
          },
          {
            "text": "ควรเลือกวิธีที่ถนัดอยู่แล้วเพื่อให้งานสำเร็จ",
            "reasoning": "play_to_strength",
            "label": "ใช้จุดแข็งที่มีอยู่"
          },
          {
            "text": "ประเมินความเสี่ยงก่อนตัดสินใจลงมือ",
            "reasoning": "risk_aware",
            "label": "ประเมินความเสี่ยงก่อนลงมือ"
          }
        ]
      },
      {
        "text": "เมื่อทำผิดพลาดซ้ำในเรื่องเดิม คุณมักจะ…",
        "options": [
          {
            "text": "มองว่าต้องปรับวิธีเรียนรู้ของตัวเอง",
            "reasoning": "self_reflective_growth",
            "label": "ทบทวนวิธีเรียนรู้ของตนเอง"
          },
          {
            "text": "หาสาเหตุเชิงระบบว่าทำไมถึงเกิดซ้ำ",
            "reasoning": "systemic_analysis",
            "label": "วิเคราะห์สาเหตุเชิงระบบ"
          },
          {
            "text": "ขอ feedback จากคนอื่นเพื่อหามุมที่มองไม่เห็น",
            "reasoning": "external_perspective",
            "label": "ขอมุมมองจากภายนอก"
          },
          {
            "text": "ยอมรับว่าบางเรื่องอาจไม่ใช่จุดแข็งของตัวเอง",
            "reasoning": "self_awareness_of_limits",
            "label": "ยอมรับขีดจำกัดของตนเอง"
          }
        ]
      },
      {
        "text": "ทัศนคติของคุณต่อการเรียนรู้สิ่งใหม่ที่ไม่เกี่ยวกับงานปัจจุบันโดยตรงคือ…",
        "options": [
          {
            "text": "คุ้มค่าเสมอเพราะไม่รู้ว่าจะได้ใช้เมื่อไหร่",
            "reasoning": "broad_learning_value",
            "label": "เห็นคุณค่าการเรียนรู้แบบกว้าง"
          },
          {
            "text": "ควรเรียนเมื่อเห็นว่าจะเกี่ยวข้องกับเป้าหมายในอนาคต",
            "reasoning": "purposeful_learning",
            "label": "เรียนรู้อย่างมีเป้าหมาย"
          },
          {
            "text": "ให้ความสำคัญกับการเชี่ยวชาญสิ่งที่ทำอยู่มากกว่า",
            "reasoning": "depth_over_breadth",
            "label": "เน้นความเชี่ยวชาญเชิงลึก"
          },
          {
            "text": "ขึ้นอยู่กับเวลาและทรัพยากรที่มี",
            "reasoning": "resource_dependent",
            "label": "ขึ้นกับทรัพยากรที่มี"
          }
        ]
      }
    ]
  },
  "problemSolving": {
    "name": "Problem-Solving Mindset",
    "nameTh": "มุมมองต่อปัญหาและการตัดสินใจ",
    "questions": [
      {
        "text": "เมื่อเจอปัญหาที่ซับซ้อนและมีหลายทางแก้ คุณมักจะ…",
        "options": [
          {
            "text": "เลือกทางที่เห็นผลเร็วที่สุด",
            "reasoning": "speed_decision",
            "label": "เน้นความเร็วในการตัดสินใจ"
          },
          {
            "text": "วิเคราะห์ข้อดีข้อเสียของแต่ละทางก่อนตัดสินใจ",
            "reasoning": "analytical",
            "label": "วิเคราะห์เชิงเปรียบเทียบ"
          },
          {
            "text": "ปรึกษาผู้อื่นเพื่อรวบรวมมุมมอง",
            "reasoning": "consultative",
            "label": "ปรึกษาผู้อื่นก่อนตัดสินใจ"
          },
          {
            "text": "เลือกทางที่เคยได้ผลมาก่อน",
            "reasoning": "experience_based",
            "label": "อิงประสบการณ์ที่ผ่านมา"
          }
        ]
      },
      {
        "text": "เมื่อข้อมูลที่มีไม่เพียงพอต่อการตัดสินใจ คุณมักจะ…",
        "options": [
          {
            "text": "ตัดสินใจจากข้อมูลเท่าที่มีแล้วปรับภายหลัง",
            "reasoning": "decisive_under_uncertainty",
            "label": "กล้าตัดสินใจภายใต้ความไม่แน่นอน"
          },
          {
            "text": "หาข้อมูลเพิ่มก่อนตัดสินใจเสมอ",
            "reasoning": "information_seeking",
            "label": "ต้องการข้อมูลให้ครบก่อน"
          },
          {
            "text": "ตั้งสมมติฐานแล้วทดสอบไปทีละขั้น",
            "reasoning": "hypothesis_testing",
            "label": "ทดลองแบบเป็นขั้นตอน"
          },
          {
            "text": "รอจนกว่าจะมีข้อมูลที่ชัดเจนพอ",
            "reasoning": "certainty_seeking",
            "label": "ต้องการความแน่นอนก่อนตัดสินใจ"
          }
        ]
      },
      {
        "text": "เมื่อวิธีแก้ปัญหาที่ใช้เป็นประจำใช้ไม่ได้ผลกับสถานการณ์ใหม่ คุณมักจะ…",
        "options": [
          {
            "text": "คิดค้นวิธีใหม่ทันที",
            "reasoning": "innovative_response",
            "label": "คิดวิธีใหม่เชิงสร้างสรรค์"
          },
          {
            "text": "ย้อนกลับไปดูต้นตอของปัญหาก่อน",
            "reasoning": "root_cause_orientation",
            "label": "มุ่งหาต้นตอของปัญหา"
          },
          {
            "text": "ถามผู้อื่นว่าเคยเจอสถานการณ์คล้ายกันหรือไม่",
            "reasoning": "social_problem_solving",
            "label": "แก้ปัญหาผ่านการถามผู้อื่น"
          },
          {
            "text": "ปรับวิธีเดิมให้เข้ากับสถานการณ์ใหม่",
            "reasoning": "adaptive_incremental",
            "label": "ปรับวิธีเดิมแบบค่อยเป็นค่อยไป"
          }
        ]
      },
      {
        "text": "เมื่อต้องตัดสินใจเรื่องที่มีความเสี่ยง คุณให้น้ำหนักกับอะไรมากที่สุด…",
        "options": [
          {
            "text": "โอกาสที่จะได้ผลลัพธ์ที่ดีที่สุด",
            "reasoning": "opportunity_focused",
            "label": "เน้นโอกาสของผลลัพธ์ที่ดี"
          },
          {
            "text": "ความเสียหายที่อาจเกิดขึ้นหากผิดพลาด",
            "reasoning": "risk_averse",
            "label": "ระมัดระวังความเสียหาย"
          },
          {
            "text": "ความเห็นของผู้มีประสบการณ์ในเรื่องนั้น",
            "reasoning": "reliance_on_expertise",
            "label": "อิงความเห็นผู้เชี่ยวชาญ"
          },
          {
            "text": "ผลกระทบต่อผู้อื่นที่เกี่ยวข้อง",
            "reasoning": "stakeholder_impact_focused",
            "label": "คำนึงถึงผู้มีส่วนได้เสีย"
          }
        ]
      }
    ]
  },
  "teamwork": {
    "name": "Teamwork Mindset",
    "nameTh": "ทัศนคติต่อการทำงานร่วมกับผู้อื่น",
    "questions": [
      {
        "text": "ในการทำงานกลุ่ม คุณมองบทบาทของตัวเองว่า…",
        "options": [
          {
            "text": "ควรเป็นผู้นำขับเคลื่อนทิศทาง",
            "reasoning": "leadership_oriented",
            "label": "เน้นบทบาทผู้นำ"
          },
          {
            "text": "ควรเป็นผู้สนับสนุนให้คนอื่นทำงานได้ราบรื่น",
            "reasoning": "support_oriented",
            "label": "เน้นบทบาทผู้สนับสนุน"
          },
          {
            "text": "ขึ้นอยู่กับว่าใครมีความสามารถเหมาะสมที่สุดในแต่ละเรื่อง",
            "reasoning": "situational_role",
            "label": "บทบาทยืดหยุ่นตามสถานการณ์"
          },
          {
            "text": "ทำในส่วนที่ได้รับมอบหมายให้ดีที่สุด",
            "reasoning": "execution_focused",
            "label": "เน้นการปฏิบัติตามที่ได้รับมอบหมาย"
          }
        ]
      },
      {
        "text": "เมื่อความเห็นของคุณกับทีมขัดแย้งกันในเรื่องสำคัญ คุณให้คุณค่ากับอะไรมากกว่า…",
        "options": [
          {
            "text": "ความเห็นที่ตนเชื่อว่าถูกต้อง",
            "reasoning": "conviction_driven",
            "label": "ยึดความเชื่อของตนเอง"
          },
          {
            "text": "ความสามัคคีและการเดินหน้าร่วมกันของทีม",
            "reasoning": "harmony_driven",
            "label": "เน้นความสามัคคีของทีม"
          },
          {
            "text": "กระบวนการตัดสินใจที่เป็นธรรมสำหรับทุกคน",
            "reasoning": "process_fairness_driven",
            "label": "เน้นความเป็นธรรมของกระบวนการ"
          },
          {
            "text": "ผลลัพธ์สุดท้ายที่ดีที่สุดสำหรับงาน",
            "reasoning": "outcome_driven",
            "label": "เน้นผลลัพธ์ที่ดีที่สุด"
          }
        ]
      },
      {
        "text": "เมื่อทำงานกับคนที่มีวิธีทำงานต่างจากตัวเองมาก คุณมักจะ…",
        "options": [
          {
            "text": "ปรับตัวเข้าหาวิธีของเขาเพื่อให้งานราบรื่น",
            "reasoning": "accommodating",
            "label": "ปรับตัวเข้าหาผู้อื่น"
          },
          {
            "text": "พยายามหาจุดร่วมระหว่างสองวิธี",
            "reasoning": "integrative",
            "label": "หาจุดร่วมระหว่างสองวิธี"
          },
          {
            "text": "ยึดวิธีของตัวเองในส่วนที่รับผิดชอบ",
            "reasoning": "maintain_own_approach",
            "label": "รักษาวิธีการของตนเอง"
          },
          {
            "text": "เปิดใจเรียนรู้วิธีใหม่จากเขา",
            "reasoning": "learning_oriented_toward_others",
            "label": "เปิดใจเรียนรู้จากผู้อื่น"
          }
        ]
      },
      {
        "text": "ในสถานการณ์ที่มีการแข่งขันภายในทีม คุณมักจะ…",
        "options": [
          {
            "text": "ให้ความสำคัญกับผลงานทีมโดยรวมเป็นหลัก",
            "reasoning": "team_first",
            "label": "ให้ความสำคัญกับทีมก่อน"
          },
          {
            "text": "สร้างสมดุลระหว่างผลงานตัวเองกับทีม",
            "reasoning": "balanced",
            "label": "สร้างสมดุลตนเอง-ทีม"
          },
          {
            "text": "มุ่งผลงานตัวเองให้โดดเด่นโดยไม่ละเลยทีม",
            "reasoning": "individual_with_team_awareness",
            "label": "เน้นตนเองแบบมีสำนึกทีม"
          },
          {
            "text": "ขึ้นกับว่าเป้าหมายขององค์กรให้น้ำหนักเรื่องใดมากกว่า",
            "reasoning": "context_driven",
            "label": "ปรับตามบริบทองค์กร"
          }
        ]
      }
    ]
  }
};

/**
 * OCEAN behavior theme groups (same 8 themes as v1), extended to include the 28 new
 * indicators introduced by the 7 revised questions.
 */
const THEMES = {
  structure: {
    name: 'การสร้างโครงสร้างและลำดับในการจัดการงาน',
    indicators: ['priority_structuring', 'structured_trial', 'detail_check', 'risk_based_check', 'idea_practical', 'trust_verify'],
    workExpr: 'อาจวางแผนและแบ่งขั้นตอนก่อนลงมือ',
    limitation: 'เมื่อเวลาจำกัดมาก อาจปรับวิธีทำงานต่างไป'
  },
  flex: {
    name: 'การปรับแนวทางและเปิดรับวิธีใหม่',
    indicators: ['exp_new_method', 'adapt_fast', 'alt_proposal', 'situational_prioritization', 'gradual_transition', 'idea_divergent', 'curiosity_broad', 'open_adopt', 'energy_context'],
    workExpr: 'อาจปรับวิธีทำงานเมื่อบริบทเปลี่ยน',
    limitation: 'ไม่ได้แปลว่ามีผลงานด้านนวัตกรรม'
  },
  info: {
    name: 'การแสวงหาข้อมูลและทำความเข้าใจก่อนตัดสินใจ',
    indicators: ['learn_from_precedent', 'seek_guidance', 'info_seeking', 'feedback_specific', 'clarify_intent', 'cross_check', 'analyze_cause', 'idea_build_on', 'curiosity_purposeful', 'open_evidence_seek', 'trust_handoff_detail', 'doubt_inquire'],
    workExpr: 'อาจรวบรวมข้อมูลหรือถามความเห็นก่อนลงมือ',
    limitation: 'อาจขึ้นกับความเร่งด่วนของสถานการณ์'
  },
  initiate: {
    name: 'การเริ่มสื่อสารและแสดงความเห็นเชิงรุก',
    indicators: ['early_voice', 'broadcast_now', 'report_early', 'prepared_voice', 'energy_social', 'visibility_broad', 'doubt_direct'],
    workExpr: 'อาจเป็นฝ่ายเริ่มสื่อสารเมื่อเห็นว่าจำเป็น',
    limitation: 'ไม่ได้แปลว่าทักษะการสื่อสารสูง'
  },
  reflect: {
    name: 'การสังเกตและไตร่ตรองก่อนสื่อสาร',
    indicators: ['observe_first', 'one_to_one', 'summarize_first', 'wait_for_forum', 'reflect_first', 'targeted_share', 'fix_then_report', 'energy_solo', 'visibility_targeted', 'doubt_internalize'],
    workExpr: 'อาจพิจารณาข้อมูลก่อนแสดงความเห็น',
    limitation: 'ไม่ได้แปลว่าทักษะการสื่อสารต่ำ'
  },
  collab: {
    name: 'การร่วมมือและรับฟังผู้อื่น',
    indicators: ['listen_first', 'compromise', 'help_now', 'stakeholder_alignment', 'team_recovery', 'peer_review', 'idea_crowdsource', 'curiosity_social', 'open_integrate', 'trust_full', 'visibility_upward', 'doubt_understanding'],
    workExpr: 'อาจให้ความสำคัญกับการประสานและความเห็นร่วม',
    limitation: 'อาจขึ้นกับความสัมพันธ์และภาระงานของตนเอง'
  },
  boundary: {
    name: 'การพิจารณาขอบเขตและยืนยันจุดยืนเชิงข้อมูล',
    indicators: ['boundary_alt', 'redirect', 'help_later', 'advocate_data', 'escalate_neutral', 'curiosity_low', 'open_listen_firm', 'energy_low_key_social', 'trust_follow_up'],
    workExpr: 'อาจระบุขอบเขตงานหรือยืนยันข้อมูลของตน',
    limitation: 'อาจต่างออกไปในทีมที่ไว้ใจกันสูง'
  },
  speed: {
    name: 'การให้ความสำคัญกับความเร็วและกำหนดส่ง',
    indicators: ['quick_completion', 'deadline_first', 'visibility_indifferent'],
    workExpr: 'อาจเน้นปิดงานให้ทันเวลา',
    limitation: 'ไม่ได้แปลว่าคุณภาพงานต่ำ'
  }
};

const CROSS_DIMENSION_PATTERNS = [
  { a: 'structure', b: 'flex', narrative: 'มีแนวโน้มสร้างโครงสร้าง ขณะเดียวกันปรับแนวทางเมื่อบริบทเปลี่ยน' },
  { a: 'initiate', b: 'reflect', narrative: 'ความเป็นฝ่ายเริ่มสื่อสารดูเปลี่ยนตามบริบท (Context-Sensitive)' },
  { a: 'collab', b: 'boundary', narrative: 'ให้ความร่วมมือ พร้อมพิจารณาขอบเขตเมื่อจำเป็น' }
];

/** Evidence-sufficiency thresholds for OCEAN (count = distinct questions supporting a theme). */
const OCEAN_EVIDENCE_THRESHOLDS = {
  REPEATED_PATTERN: 3,
  EMERGING_PATTERN: 2,
  EXPLORE_FURTHER: 1
};

/** JD → Critical Work Situation inference rules (unchanged from v1). */
const JD_SITUATION_RULES = [
  { pattern: /หลาย|multiple|priorit|deadline|พร้อมกัน/i, situation: 'หลายงานหรือ Deadline ซ้อนกัน', themes: ['structure', 'speed', 'flex'] },
  { pattern: /ประสาน|coordinat|stakeholder|cross|ข้ามฝ่าย/i, situation: 'ประสานงานกับผู้เกี่ยวข้องหลายฝ่าย', themes: ['collab', 'initiate'] },
  { pattern: /ลูกค้า|customer|client|นำเสนอ|present/i, situation: 'สื่อสารกับลูกค้า/ผู้เกี่ยวข้อง', themes: ['initiate', 'reflect'] },
  { pattern: /เปลี่ยน|change|ใหม่|improve|ปรับปรุง/i, situation: 'ความต้องการหรือแนวทางเปลี่ยนแปลง', themes: ['flex', 'info'] },
  { pattern: /ผิดพลาด|error|quality|ตรวจ|ความถูกต้อง|detail|รายงาน|report/i, situation: 'งานที่ต้องการความถูกต้อง', themes: ['structure', 'info'] },
  { pattern: /กดดัน|pressure|urgent|เร่งด่วน|complaint|ร้องเรียน/i, situation: 'สภาวะกดดัน/เร่งด่วน', themes: ['info', 'reflect', 'collab'] }
];

/** Technical/functional skill keywords — extracted from the JD but EXCLUDED from OCEAN mapping. */
const TECHNICAL_SKILL_PATTERN = /excel|sap|python|sql|power ?bi|บัญชี|accounting|english|ภาษาอังกฤษ|certif|ใบอนุญาต|negotiat|เจรจา/gi;

// ================================================================
// 1. JD Context parsing (Dynamic layer — identical logic to v1)
// ================================================================

/**
 * @param {string} text - raw JD text
 * @returns {{fields:object[], responsibilities:string[], situations:object[], technicalRequirements:string[]}}
 */
function parseJobDescription(text) {
  const lines = text.split(/\n/).map(l => l.trim()).filter(Boolean);
  const extractField = (labelPattern) => {
    const line = lines.find(l => new RegExp('^(' + labelPattern + ')\\s*[:：]', 'i').test(l));
    return line ? line.replace(/^[^:：]+[:：]\s*/, '') : null;
  };
  const fieldDefs = [
    { key: 'Job Title', labelPattern: 'ตำแหน่ง|Job Title|Title' },
    { key: 'Department', labelPattern: 'แผนก|Department' },
    { key: 'Job Purpose', labelPattern: 'วัตถุประสงค์|Purpose' }
  ];
  const fields = fieldDefs.map(({ key, labelPattern }) => {
    const value = extractField(labelPattern);
    return { key, value: value || 'Not specified in JD', direct: !!value };
  });

  const responsibilities = lines
    .filter(l => /^[-•*·\d.)]+\s*/.test(l) && !/^\d+\s*ปี/.test(l))
    .map(l => l.replace(/^[-•*·\d.)]+\s*/, ''));

  const situations = [];
  responsibilities.forEach((line, i) => {
    JD_SITUATION_RULES.forEach(rule => {
      if (!rule.pattern.test(line)) return;
      let entry = situations.find(s => s.situation === rule.situation);
      if (!entry) { entry = { situation: rule.situation, themes: rule.themes, sources: [] }; situations.push(entry); }
      entry.sources.push(`Responsibility #${i + 1}: ${line}`);
    });
  });

  const technicalRequirements = [...new Set((text.match(TECHNICAL_SKILL_PATTERN) || []).map(t => t.toLowerCase()))];
  return { fields, responsibilities, situations, technicalRequirements };
}

// ================================================================
// 2. OCEAN evidence-based analysis (same model as v1, new item bank)
// ================================================================

/**
 * @param {(number|null)[]} oceanAnswers - length-30 array, option index (0-3) or null
 */
function analyzeOceanResponses(oceanAnswers) {
  const evidenceItems = oceanAnswers
    .map((choice, i) => {
      if (choice == null) return null;
      const q = OCEAN_QUESTIONS[i];
      const opt = q.options[choice];
      return { questionNo: q.id, question: q.text, construct: q.construct, selectedOption: opt.text, indicator: opt.indicator };
    })
    .filter(Boolean);

  const result = {};
  Object.entries(THEMES).forEach(([themeKey, theme]) => {
    const evidence = evidenceItems.filter(e => theme.indicators.includes(e.indicator));
    if (evidence.length === 0) return;
    const count = new Set(evidence.map(e => e.questionNo)).size;
    const status =
      count >= OCEAN_EVIDENCE_THRESHOLDS.REPEATED_PATTERN ? 'REPEATED PATTERN' :
      count === OCEAN_EVIDENCE_THRESHOLDS.EMERGING_PATTERN ? 'EMERGING PATTERN' :
      'EXPLORE FURTHER';
    result[themeKey] = { themeKey, theme, count, status, evidence };
  });
  return result;
}

function findCrossDimensionPatterns(oceanPatterns) {
  return CROSS_DIMENSION_PATTERNS.filter(({ a, b }) => {
    const pa = oceanPatterns[a], pb = oceanPatterns[b];
    return pa && pb && pa.count >= 1 && pb.count >= 1 && (pa.count + pb.count) >= 3;
  });
}

// ================================================================
// 3. Work Mindset analysis — REASONING PATTERNS, never a score
// ================================================================

/**
 * For each Mindset dimension, lists which reasoning patterns were chosen and how many
 * times (out of that dimension's 4 situational items). This is descriptive only: no
 * pattern is ranked above another, and a dimension with answers split across several
 * reasoning types is reported as "mixed / context-dependent", not resolved to one label.
 *
 * @param {{[dimensionKey:string]: (number|null)[]}} mindsetAnswers - e.g.
 *   { time: [0,2,1,3], ownership: [1,1,0,2], growth: [...], problemSolving: [...], teamwork: [...] }
 *   each inner array has one entry per question in that dimension (option index 0-3, or null)
 */
function analyzeMindsetResponses(mindsetAnswers) {
  const result = {};
  Object.entries(MINDSET_DIMENSIONS).forEach(([dimKey, dim]) => {
    const answers = mindsetAnswers[dimKey] || [];
    const evidence = [];
    dim.questions.forEach((q, i) => {
      const choice = answers[i];
      if (choice == null) return;
      const opt = q.options[choice];
      evidence.push({ questionNo: i + 1, question: q.text, selectedOption: opt.text, reasoning: opt.reasoning, label: opt.label });
    });
    if (evidence.length === 0) return;

    // Tally how many times each reasoning pattern recurred within this dimension.
    const tally = {};
    evidence.forEach(e => { tally[e.reasoning] = (tally[e.reasoning] || 0) + 1; });
    const recurring = Object.entries(tally).filter(([, n]) => n >= 2).map(([reasoning, n]) => ({ reasoning, count: n }));

    result[dimKey] = {
      dimensionKey: dimKey,
      name: dim.name,
      nameTh: dim.nameTh,
      answeredCount: evidence.length,
      totalQuestions: dim.questions.length,
      recurringPatterns: recurring, // same reasoning chosen >=2 times in this dimension
      mixed: recurring.length === 0 && evidence.length >= 2, // no reasoning repeated -> genuinely mixed/context-dependent
      evidence
    };
  });
  return result;
}

// ================================================================
// 4. Structured interview generation (OCEAN-driven, same model as v1)
// ================================================================

function generateInterviewQuestions(oceanPatterns, jobContext, max = 5) {
  if (!jobContext) return [];
  const out = [];
  for (const situation of jobContext.situations) {
    for (const themeKey of situation.themes) {
      const p = oceanPatterns[themeKey];
      if (p && p.count >= OCEAN_EVIDENCE_THRESHOLDS.EMERGING_PATTERN && out.length < max) {
        out.push({
          areaToVerify: p.theme.name,
          jobContext: situation.situation,
          mainQuestion: `ช่วยเล่าตัวอย่างจริงที่ต้อง "${situation.situation}" — สถานการณ์ หน้าที่ และสิ่งที่คุณทำ (STAR)?`,
          probes: ['คุณเลือกวิธีนั้นเพราะอะไร (Decision Rationale)?', 'ผลลัพธ์เป็นอย่างไร?', 'ถ้าย้อนกลับได้จะทำอะไรต่างไป (Learning)?'],
          listenFor: 'การกระทำเฉพาะเจาะจง เหตุผล ผลลัพธ์ และการเรียนรู้',
          verificationStatus: null
        });
      }
    }
  }
  return out;
}

// ================================================================
// 5. Report assembly — OCEAN and Work Mindset stay in separate sections
// ================================================================

/**
 * @param {(number|null)[]} oceanAnswers
 * @param {{[dimensionKey:string]: (number|null)[]}} mindsetAnswers
 * @param {ReturnType<typeof parseJobDescription>|null} jobContext
 * @param {{candidateName?:string, candidateEmail?:string, jdVersion?:string}} [meta]
 */
function generateReport(oceanAnswers, mindsetAnswers, jobContext, meta = {}) {
  const oceanPatterns = analyzeOceanResponses(oceanAnswers);
  const oceanList = Object.values(oceanPatterns);
  const sufficientOcean = oceanList.filter(p => p.count >= OCEAN_EVIDENCE_THRESHOLDS.EMERGING_PATTERN);
  const crossDimension = findCrossDimensionPatterns(oceanPatterns);
  const interviewGuide = generateInterviewQuestions(oceanPatterns, jobContext);

  const mindsetResult = analyzeMindsetResponses(mindsetAnswers);

  const answeredOceanCount = oceanAnswers.filter(a => a != null).length;
  const distinctIndicators = new Set(
    oceanAnswers.map((a, i) => (a == null ? null : OCEAN_QUESTIONS[i].options[a].indicator)).filter(Boolean)
  ).size;

  const processingLog = [
    `1. รับคำตอบ OCEAN ${answeredOceanCount}/${OCEAN_QUESTIONS.length} ข้อ, Work Mindset ${Object.values(mindsetResult).reduce((a, m) => a + m.answeredCount, 0)}/${Object.values(MINDSET_DIMENSIONS).reduce((a, m) => a + m.questions.length, 0)} ข้อ`,
    `2. แปลงคำตอบ OCEAN เป็น indicator ที่กำหนดล่วงหน้า (พบ ${distinctIndicators} ชนิด) — ไม่มีการตีความคำตอบใหม่`,
    `3. รวมหลักฐาน OCEAN เป็นกลุ่มพฤติกรรม ${oceanList.length} กลุ่ม นับจำนวนสถานการณ์ที่ต่างกัน (ไม่ใช่คะแนน)`,
    `4. Evidence Sufficiency Gate (OCEAN): ผ่าน ${sufficientOcean.length} กลุ่ม (เกณฑ์ >=2 สถานการณ์) · ยังไม่พอ ${oceanList.length - sufficientOcean.length} กลุ่ม`,
    `5. วิเคราะห์ Work Mindset แยกต่างหาก — หา "รูปแบบเหตุผล" ที่ปรากฏซ้ำในแต่ละมิติ (ไม่ใช่คะแนน ไม่จัดอันดับว่าดีกว่ากัน)`,
    `6. เชื่อมหลักฐาน OCEAN ที่เพียงพอกับสถานการณ์งานจาก JD (ถ้ามี) เพื่อสร้างคำถามสัมภาษณ์`
  ];

  return {
    aiGovernance: 'AI-Assisted / Rule-Based Interpretation — Human Review Required',
    validationStatus: 'Prototype — Not Psychometrically Validated (รวมถึงชั้น Work Mindset ที่เพิ่งออกแบบใหม่)',
    assessmentVersion: ASSESSMENT_VERSION,
    jdVersion: jobContext ? (meta.jdVersion || 'JD-1.0') : null,
    candidateName: meta.candidateName || null,
    candidateEmail: meta.candidateEmail || null,
    processingLog,

    // -- Section A: OCEAN (HOW people tend to work) --
    oceanProfile: {
      coreBehavioralProfile: oceanList.map(p => ({
        theme: p.theme.name,
        status: p.status,
        sufficientEvidence: p.count >= OCEAN_EVIDENCE_THRESHOLDS.EMERGING_PATTERN,
        narrative: p.count >= OCEAN_EVIDENCE_THRESHOLDS.EMERGING_PATTERN
          ? `คำตอบจากสถานการณ์ที่ต่างกัน ${p.count} สถานการณ์สะท้อนแนวโน้มด้าน${p.theme.name}`
          : 'ข้อมูลจากสถานการณ์ที่สำรวจยังไม่เพียงพอที่จะระบุแนวโน้มที่ชัดเจน ควรสำรวจเพิ่มเติมในการสัมภาษณ์',
        possibleWorkExpression: p.count >= OCEAN_EVIDENCE_THRESHOLDS.EMERGING_PATTERN ? p.theme.workExpr : null,
        contextLimitation: p.theme.limitation,
        evidence: p.evidence
      })),
      crossDimension: crossDimension.map(({ a, b, narrative }) => ({ themes: [a, b], narrative })),
      jobRelevantObservations: jobContext
        ? jobContext.situations.map(s => ({
            jobContext: s.situation, sources: s.sources,
            relatedPatterns: s.themes.filter(k => oceanPatterns[k]).map(k => oceanPatterns[k].theme.name)
          })).filter(o => o.relatedPatterns.length > 0)
        : [],
      notCoveredByOcean: jobContext
        ? jobContext.technicalRequirements.map(t => ({ requirement: t, note: 'Requires Separate Verification (CV / Technical Test / Work Sample)' }))
        : []
    },

    // -- Section B: Work Mindset (WHY people reason the way they do) — kept separate from OCEAN --
    mindsetProfile: Object.values(mindsetResult).map(m => ({
      dimension: m.name,
      dimensionTh: m.nameTh,
      answeredCount: m.answeredCount,
      totalQuestions: m.totalQuestions,
      narrative: m.recurringPatterns.length > 0
        ? `พบรูปแบบเหตุผลที่ปรากฏซ้ำ: ${m.recurringPatterns.map(r => r.reasoning).join(', ')} (${m.recurringPatterns.map(r => r.count).join(', ')} จาก ${m.totalQuestions} สถานการณ์) — เป็นแนวโน้มมุมมองหนึ่ง ไม่ใช่ข้อดีหรือข้อเสีย`
        : 'คำตอบกระจายไปตามรูปแบบเหตุผลที่หลากหลาย ไม่พบรูปแบบเดียวที่ซ้ำ — สะท้อนว่ามุมมองอาจปรับไปตามแต่ละสถานการณ์มากกว่ามีหลักยึดตายตัว',
      evidence: m.evidence
    })),

    interviewGuide,
    disclaimer:
      'ผลนี้สะท้อนแนวโน้มพฤติกรรมและมุมมองจากคำตอบต่อสถานการณ์ที่กำหนด ไม่ใช่การวินิจฉัยทางจิตวิทยา ไม่ใช่เกณฑ์เดียวในการตัดสินใจจ้างงาน OCEAN และ Work Mindset เป็นคนละมิติที่ไม่ควรนำมารวมเป็นคะแนนเดียวกัน ควรพิจารณาร่วมกับการสัมภาษณ์ Work Sample และหลักฐานอื่น',
    usageGuidance: {
      step1_how: 'ใช้ OCEAN เพื่อเข้าใจว่าบุคคลนี้ "ทำงานอย่างไร" (HOW) — ปรับรูปแบบการสื่อสารและวิธีมอบหมายงานให้เหมาะกับแนวโน้มที่พบ',
      step2_why: 'ใช้ Work Mindset เพื่อเข้าใจว่า "ทำไมถึงทำแบบนั้น" (WHY) — ปรับวิธีสร้างแรงจูงใจและการตั้งความคาดหวังให้สอดคล้องกับเหตุผลเบื้องหลัง',
      step3_combine: 'นำทั้งสองมาใช้ร่วมกันใน 3 เรื่อง: (1) การสื่อสาร — จับคู่ช่องทาง/จังหวะที่เหมาะ (จาก OCEAN) กับกรอบเหตุผลที่โน้มน้าวได้ผล (จาก Mindset) (2) การมอบหมายงาน — ใช้ Ownership และ Problem-Solving Mindset ช่วยตัดสินใจว่าควรให้ตัดสินใจเองหรือควรมีการตรวจสอบเป็นระยะ (3) การทำงานร่วมกัน — เมื่อคนสองคนมีแนวโน้มต่างขั้วกัน ใช้ผลนี้เป็นจุดเริ่มการพูดคุยตกลงร่วมกัน ไม่ใช่การตัดสินว่าใครถูกผิด'
    }
  };
}

// ================================================================
// 6. Item-bank quality audit (rule-based, not a validity proof)
// ================================================================

function auditOceanItemBank() {
  const findings = [];
  OCEAN_QUESTIONS.forEach(q => {
    const indicatorSet = new Set(q.options.map(o => o.indicator));
    if (indicatorSet.size < q.options.length) findings.push({ questionNo: q.id, issue: 'Duplicate indicator within the same question' });
    const lengths = q.options.map(o => o.text.length);
    if (Math.max(...lengths) / Math.min(...lengths) > 2.2) findings.push({ questionNo: q.id, issue: 'Unbalanced option length (possible leading phrasing)' });
    const allText = q.text + q.options.map(o => o.text).join('');
    if (/เสมอ|ไม่เคย|ทุกครั้ง|ไม่มีทาง/.test(allText)) findings.push({ questionNo: q.id, issue: 'Contains absolute language' });
    if (q.options.some(o => !Object.values(THEMES).some(t => t.indicators.includes(o.indicator)))) {
      findings.push({ questionNo: q.id, issue: 'Indicator not mapped to any theme' });
    }
  });
  return findings;
}

function auditMindsetItemBank() {
  const findings = [];
  Object.entries(MINDSET_DIMENSIONS).forEach(([dimKey, dim]) => {
    dim.questions.forEach((q, i) => {
      const reasoningSet = new Set(q.options.map(o => o.reasoning));
      if (reasoningSet.size < q.options.length) findings.push({ dimension: dimKey, questionNo: i + 1, issue: 'Duplicate reasoning tag within the same question' });
      const lengths = q.options.map(o => o.text.length);
      if (Math.max(...lengths) / Math.min(...lengths) > 2.5) findings.push({ dimension: dimKey, questionNo: i + 1, issue: 'Unbalanced option length' });
      if (/เสมอ|ไม่เคย|ทุกครั้ง|ไม่มีทาง/.test(q.text + q.options.map(o => o.text).join(''))) {
        findings.push({ dimension: dimKey, questionNo: i + 1, issue: 'Contains absolute language' });
      }
    });
  });
  return findings;
}

// ================================================================
// Exports
// ================================================================

module.exports = {
  ASSESSMENT_VERSION,
  REVISION_NOTES,
  INDICATORS,
  OCEAN_QUESTIONS,
  THEMES,
  CROSS_DIMENSION_PATTERNS,
  OCEAN_EVIDENCE_THRESHOLDS,
  JD_SITUATION_RULES,
  TECHNICAL_SKILL_PATTERN,
  MINDSET_DIMENSIONS,
  parseJobDescription,
  analyzeOceanResponses,
  findCrossDimensionPatterns,
  analyzeMindsetResponses,
  generateInterviewQuestions,
  generateReport,
  auditOceanItemBank,
  auditMindsetItemBank
};
