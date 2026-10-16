# 퀴즈 시안 반영

첨부한 GEN Z QUIZ 시안을 기준으로 카드, 제목, 탭, 진행 표시, 선택지와 버튼을 조정했습니다. 문항·선택지·채점은 기존 React 화면과 학습 추적 기능을 사용합니다.

캐릭터: `public/quiz/assets/pen-sky.png` (1024 × 1536, 투명 PNG). 첨부 시안을 참고하여 built-in ImageGen으로 재현한 자산이며 원본을 그대로 잘라낸 이미지는 아닙니다.

생성 프롬프트:

> Use case: background-extraction. Asset type: transparent PNG mascot for the user's quiz web app. Input images: the USER'S attached GEN Z QUIZ screenshot is the target/reference; the other local image of a dark navy-and-gold pen must be ignored. Extract/recreate ONLY the cute light cyan cartoon pen mascot in the lower left of the GEN Z QUIZ screenshot, full body, white gloves, pointing toward the upper right, orange-and-white sneakers, orange pocket clip on left, small dark navy push-button at top, cream face panel with small dark eyes, small smile and peach cheeks, leaning slightly left. Preserve its hand-drawn dark navy outlines and simple soft cyan shading. Include the tiny navy/orange motion doodles around the character and soft oval ground shadow. No speech bubble, no text, no UI, no white background, actual transparent alpha. Character isolated and fully visible, portrait composition with minimal transparent margin. Match the attached screenshot's friendly flat illustrated character closely.
