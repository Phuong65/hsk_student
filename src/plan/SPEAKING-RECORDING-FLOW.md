# Flow Speaking (Recording) — Chi tiết từng bước

> Tài liệu này mô tả TOÀN BỘ cơ chế ghi âm câu hỏi Speaking trong module `lam-bai-theo-ky-nang`.  
> **Mục tiêu:** Một developer khác đọc xong có thể implement lại y nguyên mà không cần mở source code.

---

## 1. Interface & State Machine

### 1.1 `RecordQuestionState`

```typescript
interface RecordQuestionState {
    phase: 'idle' | 'preparing' | 'recording' | 'recorded' | 'uploading' | 'uploaded' | 'error';
    prepareLeft: number;    // Giây còn lại trong giai đoạn chuẩn bị (thường = 0)
    speakingLeft: number;   // Giây còn lại trong giai đoạn nói (mặc định 30)
    audioUrl?: string;      // URL blob/file của recording
    isSpeaking?: boolean;   // TRUE nếu đang phân tích âm thanh thấy giọng nói
    file?: File;            // File MP3 đã ghi (từ MicRecorder)
    uploadResult?: any;     // Kết quả upload từ AWS (chứa fileId, id)
    error?: string;         // Thông báo lỗi (nếu phase === 'error')
    audioLoadFailed?: boolean; // TRUE nếu audio player load thất bại
}
```

### 1.2 State Machine

```
    idle
     │
     ▼
  preparing ──── (nếu prepareTime <= 0) ──┐
     │                                     │
     ▼                                     ▼
  recording ── canSubmitRecordEarly ──► submit sớm
     │
     ▼
  recorded ──► uploadRecording() ──► uploading
                                        │
                                   ┌────┴────┐
                                   ▼         ▼
                               uploaded    error
                                             │
                                             ▼
                               retry → quay về idle/prepare
```

---

## 2. Câu hỏi nào được mở thu âm?

### 2.1 Phát hiện câu hỏi Record

```typescript
// Method check:
isRecordQuestion(question: StudentQuestionView): boolean {
    return !!question && question.question_type === 'record';
}
```

➡ **Chỉ có `question_type === 'record'`** mới được xử lý như câu hỏi ghi âm.

### 2.2 Khi nào Recording tự động mở? — `prepareActiveRecordQuestion()`

```typescript
private prepareActiveRecordQuestion(): void {
    // KHÔNG mở nếu đang có upload in progress
    if (this.hasRecordUploadInProgress()) {
        return;
    }

    const recordQuestion = this.activeRecordQuestion();
    if (recordQuestion) {
        this.prepareRecordQuestion(recordQuestion);
    }
}
```

➡ **Gọi ở 2 chỗ:**
1. `ngOnInit → loadQuestionTest()` — khi vừa vào skill
2. `setActiveParent()` — mỗi khi chuyển câu

### 2.3 Logic chọn câu Record nào — `activeRecordQuestion()`

```typescript
private activeRecordQuestion(): StudentQuestionView {
    const parent = this.currentParent;
    if (!parent) return null;

    // TRƯỜNG HỢP 1: Parent có children
    if (parent.children?.length) {
        // Tìm child đầu tiên là record VÀ chưa trả lời VÀ không đang lỗi
        const recordQuestion = parent.children
            .filter(question => this.isRecordQuestion(question))
            .find(question => !this.isRecordQuestionAnswered(question));

        return recordQuestion &&
               this.recordState(recordQuestion)?.phase !== 'error'
               ? recordQuestion
               : null;
    }

    // TRƯỜNG HỢP 2: Parent tự nó là record
    return this.isRecordQuestion(parent) &&
           !this.isRecordQuestionAnswered(parent) &&
           this.recordState(parent)?.phase !== 'error'
           ? parent
           : null;
}
```

**Tóm tắt logic:**
| Tình huống | Hành vi |
|---|---|
| Parent có children | Chỉ mở recording cho CHILD đầu tiên là record, chưa trả lời, không lỗi |
| Parent tự là record | Mở recording nếu parent chưa trả lời, không lỗi |
| Parent là record nhưng có children | `shouldRenderParentControl()` → **false** — không hiển thị control ở parent level |
| Child record đã upload thành công | `isRecordQuestionAnswered()` → true → không mở lại |
| Đang có upload in progress | `hasRecordUploadInProgress()` → true → không mở |
| State ở phase error | Không mở (phải retry thủ công) |
| Câu record tiếp theo (sau khi upload xong câu trước) | `uploadRecording()` gọi `prepareActiveRecordQuestion()` sau 2 giây timeout |

### 2.4 Khi nào câu Record được coi là "đã trả lời"? — `isRecordQuestionAnswered()`

```typescript
private isRecordQuestionAnswered(question: StudentQuestionView): boolean {
    const state = this.recordState(question);

    // Nếu đang ở phase preparing/recording/uploading/error → chưa xong
    if (state?.phase === 'preparing' ||
        state?.phase === 'recording' ||
        state?.phase === 'uploading' ||
        state?.phase === 'error') {
        return false;
    }

    // Đã trả lời nếu có fileId/fileName/filePath trong answer HOẶC state === 'uploaded'
    const answer = this.answerValue(question);
    return !!answer?.fileId || !!answer?.fileName || !!answer?.filePath || state?.phase === 'uploaded';
}
```

### 2.5 Khi nào Recording KHÔNG được mở

| Điều kiện | Method | Kết quả |
|---|---|---|
| Đang upload | `hasRecordUploadInProgress()` | `prepareActiveRecordQuestion()` return ngay |
| Câu đã upload thành công | `isRecordQuestionAnswered()` = true | `activeRecordQuestion()` return null |
| State ở error | `recordState(question)?.phase === 'error'` | `activeRecordQuestion()` return null |
| Câu hỏi không phải `question_type === 'record'` | `isRecordQuestion()` = false | Bị filter |
| Người dùng đang chuyển câu | `setActiveParent()` gọi `cleanupActiveRecordQuestion()` trước | Recording cũ bị dọn |

---

## 3. Flow Chi Tiết Từng Bước

### 3.1 Flow tổng thể

```
[User đến trang có câu hỏi record]
         │
         ▼
prepareActiveRecordQuestion()
    ├─ hasRecordUploadInProgress()? → return (nếu đang upload)
    └─ activeRecordQuestion()
         ├─ Tìm câu record chưa trả lời
         └─ prepareRecordQuestion(question)
              │
              ▼
        ┌─────────────────────┐
        │  PREPARE PHASE      │
        │  state.phase =      │
        │  'preparing'        │
        └────────┬────────────┘
                 │
        prepareTime > 0?
           ├─ YES → startPrepareCountdown()
           │          └─ setInterval 1s → prepareLeft--
           │             └─ prepareLeft <= 0 → playBeepAndStartRecording()
           └─ NO → playBeepAndStartRecording() (tức thì)
                       │
                       ▼
        ┌─────────────────────────┐
        │  BEEP PHASE             │
        │  Tính delay (500-3000ms)│
        │  → playBeepSound()      │
        │  → setTimeout 200ms     │
        └────────┬────────────────┘
                 │
                 ▼
        ┌─────────────────────────┐
        │  RECORDING PHASE        │
        │  state.phase =          │
        │  'recording'            │
        │  ┌─────────────────┐    │
        │  │MicRecorder.start│    │
        │  └────────┬────────┘    │
        │           │             │
        │  ┌────────▼────────┐   │
        │  │ SpeakingIndicator│   │
        │  │ (AnalyserNode)  │   │
        │  └─────────────────┘   │
        │  ┌─────────────────┐   │
        │  │ SpeakingCountdown│   │
        │  │ (setInterval 1s) │   │
        │  └────────┬────────┘   │
        └───────────┼────────────┘
                    │
          speakingLeft <= 0
          HOẶC user bấm "Submit answer"
                    │
                    ▼
        ┌─────────────────────────┐
        │  STOP RECORDING         │
        │  stopSpeakingIndicator()│
        │  recorder.stop()        │
        │  .getMp3() → File       │
        │  state.phase =          │
        │  'recorded'             │
        └────────┬────────────────┘
                 │
                 ▼
        ┌─────────────────────────┐
        │  UPLOAD PHASE           │
        │  state.phase =          │
        │  'uploading'            │
        │  uploadFileAwsWidthProgress│
        │  (retry tối đa 2 lần)  │
        └────────┬────────────────┘
                 │
           ┌─────┴─────┐
           ▼           ▼
      ┌────────┐  ┌────────┐
      │UPLOADED│  │ ERROR  │
      │phase = │  │phase = │
      │'upload'│  │'error' │
      └───┬────┘  └───┬────┘
          │           │
          ▼           ▼
   prepareActive    Retry button
   RecordQuestion   → retryRecordQuestion()
   (sau 2s)              ├─ nếu còn file → upload lại
                          └─ nếu không → prepareRecordQuestion() từ đầu
```

### 3.2 Bước 1: `prepareRecordQuestion(question)`

**Khi gọi:** `prepareActiveRecordQuestion()` → tìm ra câu record → gọi hàm này.

```typescript
prepareRecordQuestion(question) {
    key = questionKey(question);

    // Nếu state đã tồn tại và không phải idle/error → bỏ qua (đang xử lý)
    if (recordStates[key] && recordStates[key].phase !== 'idle' && recordStates[key].phase !== 'error')
        return;

    prepareTime = recordPrepareSeconds(question);  // Mặc định 0

    // Tạo state mới
    recordStates[key] = {
        phase: 'preparing',
        prepareLeft: prepareTime,
        speakingLeft: recordSpeakingSeconds(question)  // Mặc định 30
    };

    if (prepareTime <= 0)
        playBeepAndStartRecording(question);  // Không có đếm ngược prepare
    else
        startPrepareCountdown(question);      // Đếm ngược prepare xong mới record
}
```

### 3.3 Bước 2: Prepare Countdown — `startPrepareCountdown(question)`

```typescript
startPrepareCountdown(question) {
    key = questionKey(question);
    clearRecordTimer(key);  // Xóa timer cũ nếu có

    // Nếu prepareLeft <= 0 → chuyển thẳng sang recording
    if (recordStates[key].prepareLeft <= 0) {
        playBeepAndStartRecording(question);
        return;
    }

    // setInterval giảm prepareLeft mỗi giây
    recordTimers[key] = setInterval(() => {
        state = recordStates[key];
        if (!state || state.phase !== 'preparing') {
            clearRecordTimer(key);
            return;
        }
        state.prepareLeft -= 1;
        if (state.prepareLeft <= 0) {
            clearRecordTimer(key);
            playBeepAndStartRecording(question);
        }
    }, 1000);
}
```

### 3.4 Bước 3: Beep Sound — `playBeepSound()` + `generateBeepWavUrl()`

File âm thanh beep được **tạo hoàn toàn bằng code** (không cần file audio tĩnh):

```typescript
// Tạo WAV file in-memory (880Hz, 0.2 giây, volume 1)
generateBeepWavUrl(frequency: 880, duration: 0.2, volume: 1): string {
    sampleRate = 8000;
    numSamples = sampleRate * duration = 1600 samples;

    // Xây dựng WAV binary:
    // [RIFF header][WAVE][fmt chunk][data chunk]

    // Mỗi sample: sin(2π * 880 * t) * volume
    // Fade in/out: 100 samples đầu/ cuối
    // 8-bit PCM mono

    return URL.createObjectURL(blob);  // Tạo blob URL
}

// Phát beep và chờ 250ms
playBeepSound(): Promise<void> {
    if (!beepAudioUrl) beepAudioUrl = generateBeepWavUrl(880, 0.2, 1);
    audio = new Audio(beepAudioUrl);
    audio.volume = 1;
    audio.play();
    // setTimeout 250ms → resolve
}
```

**Thông số beep:**
| Parameter | Giá trị |
|---|---|
| Frequency | 880 Hz (A5) |
| Duration | 0.2 giây |
| Volume | 1.0 (max) |
| Sample rate | 8000 Hz |
| Format | 8-bit PCM mono WAV |
| Fade in/out | 100 samples (~12.5ms) |

### 3.5 Bước 4: `startRecording(question)` — Mở microphone

```typescript
startRecording(question) {
    key = questionKey(question);
    state = recordStates[key];
    if (!state || state.phase === 'recording') return;

    state.phase = 'recording';
    state.error = '';

    // Tính delay trước beep:
    // - Nếu beep gần đây (< 3s) → chờ cho đủ 3s từ lần beep cuối
    // - Nếu beep lâu rồi (≥ 3s) → chờ 500ms
    now = Date.now();
    timeSinceLastBeep = now - lastBeepTime;
    delay = timeSinceLastBeep < 3000 ? 3000 - timeSinceLastBeep : 500;

    setTimeout(delay) {
        playBeepSound().then(() => {
            lastBeepTime = Date.now();

            setTimeout(200ms) {  // Chờ 200ms sau beep
                // Mở MicRecorder
                recorder = new MicRecorder({ bitRate: 128 });
                recorders[key] = recorder;

                recorder.start().then(() => {
                    // BẮT ĐẦU GHI:
                    startSpeakingIndicator(question);   // Phân tích âm thanh realtime
                    startSpeakingCountdown(question);   // Đếm ngược thời gian nói
                }).catch(() => {
                    // LỖI: không truy cập được microphone
                    state.phase = 'error';
                    state.error = 'Không thể truy cập microphone.';
                });
            }
        });
    }
}
```

**Timing diagram:**
```
[prepare countdown] → [beep 880Hz 0.2s] → [200ms gap] → [MicRecorder START] → [recording]
                                           ↑
                                    Nếu prepareTime = 0
                                    thì xảy ra tức thì (không countdown)

Delay giữa các lần beep:
- Nếu lần beep cuối < 3s → chờ đủ 3s, sau đó delay 500ms
- Nếu lần beep cuối ≥ 3s → delay 500ms
```

### 3.6 Bước 5: Speaking Indicator — `startSpeakingIndicator(question)`

Đây là cơ chế **phát hiện giọng nói realtime** để animate icon microphone:

```typescript
startSpeakingIndicator(question) {
    key = questionKey(question);
    state = recordStates[key];
    if (!state || !navigator.mediaDevices?.getUserMedia) return;

    stopSpeakingIndicator(key);  // Dọn cũ

    getUserMedia({ audio: true }).then(stream => {
        audioContext = new AudioContext();
        analyser = audioContext.createAnalyser();
        analyser.fftSize = 256;

        audioContext.createMediaStreamSource(stream).connect(analyser);
        data = new Uint8Array(analyser.frequencyBinCount);

        recordAudioContexts[key] = audioContext;
        recordAudioStreams[key] = stream;

        // VÒNG LẶP DETECT GIỌNG NÓI:
        function detectSpeaking() {
            if (state.phase !== 'recording') {
                stopSpeakingIndicator(key);
                return;
            }

            analyser.getByteFrequencyData(data);
            average = data.reduce((a,b) => a+b, 0) / data.length;

            // THRESHOLD: nếu average > 12 → coi như đang nói
            state.isSpeaking = average > 12;

            requestAnimationFrame(detectSpeaking);
        }

        detectSpeaking();
    }).catch(() => null);
}
```

**Cơ chế:**
| Component | Vai trò |
|---|---|
| `AudioContext` | Tạo môi trường xử lý audio |
| `AnalyserNode` (fftSize=256) | Phân tích tần số realtime |
| `getByteFrequencyData()` | Lấy dữ liệu tần số (0-255) |
| Average > 12 | **Threshold** — coi như đang nói |
| `requestAnimationFrame` | Vòng lặp check mượt (~60fps) |

### 3.7 Bước 5b: Phân tích âm thanh bằng `AnalyserNode`

```
Audio Stream (microphone)
       │
       ▼
MediaStreamSource
       │
       ▼
AnalyserNode (fftSize = 256)
       │
       ├► getByteFrequencyData(data)
       │   data = Uint8Array(128)  ← frequencyBinCount = fftSize/2
       │   mỗi phần tử: 0-255
       │
       ▼
average = sum(data) / data.length
       │
       ├─ average > 12 → state.isSpeaking = true
       └─ average ≤ 12 → state.isSpeaking = false
```

### 3.8 Bước 6: Speaking Countdown — `startSpeakingCountdown(question)`

```typescript
startSpeakingCountdown(question) {
    key = questionKey(question);
    state = recordStates[key];
    clearRecordTimer(key);

    // Nếu hết thời gian ngay → stop
    if (!state || state.speakingLeft <= 0) {
        stopRecording(question, activeParentKey, parentQuestionId);
        return;
    }

    // setInterval giảm speakingLeft mỗi giây
    recordTimers[key] = setInterval(() => {
        currentState = recordStates[key];
        if (!currentState || currentState.phase !== 'recording') {
            clearRecordTimer(key);
            return;
        }
        currentState.speakingLeft -= 1;
        if (currentState.speakingLeft <= 0) {
            clearRecordTimer(key);
            stopRecording(question, activeParentKey, parentQuestionId);
        }
    }, 1000);
}
```

### 3.9 Submit sớm — `canSubmitRecordEarly()` / `submitRecordEarly()`

```typescript
// Điều kiện: đang recording VÀ đã nói >= 20s
canSubmitRecordEarly(question): boolean {
    state = recordState(question);
    return state?.phase === 'recording'
        && (recordSpeakingSeconds(question) - state.speakingLeft) >= 20;
}

submitRecordEarly(question) {
    key = questionKey(question);
    state = recordStates[key];
    if (!state || state.phase !== 'recording') return;

    clearRecordTimer(key);           // Dừng countdown
    stopRecording(question, ...);    // Stop + upload ngay
}
```

➡ **User chỉ có thể submit sớm nếu đã nói ít nhất 20 giây.**

### 3.10 Bước 7: `stopRecording(question)` — Dừng ghi âm

```typescript
stopRecording(question, activeParentKey, parentQuestionId) {
    key = questionKey(question);
    state = recordStates[key];
    recorder = recorders[key];
    if (!state || !recorder) return;

    stopSpeakingIndicator(key);     // Dừng phân tích âm thanh
    state.phase = 'recorded';

    // Lấy dữ liệu MP3
    recorder.stop().getMp3().then(([buffer, blob]) => {
        createdAt = Date.now();
        file = new File(buffer,
            `record-${key}-${createdAt}.mp3`,
            { type: blob.type });

        // Tạo local URL để preview
        if (state.audioUrl) URL.revokeObjectURL(state.audioUrl);
        state.file = file;
        state.audioUrl = URL.createObjectURL(file);

        // BẮT ĐẦU UPLOAD:
        uploadRecording(question, file, activeParentKey, parentQuestionId);

    }).catch(() => {
        state.phase = 'error';
        state.error = 'Không thể lưu file ghi âm.';
    });
}
```

### 3.11 Bước 8: `uploadRecording()` — Upload lên AWS

```typescript
uploadRecording(question, file, activeParentKey, parentQuestionId, retryCount = 0) {
    key = questionKey(question);
    state = recordStates[key];
    if (!state) return;

    state.phase = 'uploading';

    fileService.uploadFileAwsWidthProgress(file, 'student_record').subscribe({
        next: upload => {
            if (upload.state !== 'DONE') return;  // Chờ hoàn thành

            uploadedFile = upload.content?.data?.[0];

            // Nếu upload thành công nhưng không có ID
            if (!uploadedFile?.id) {
                if (retryCount < 2) {
                    // Retry sau 1.5s
                    setTimeout(uploadRecording(..., retryCount+1), 1500);
                    return;
                }
                state.phase = 'error';
                state.error = 'Upload file ghi âm thất bại.';
                return;
            }

            // Upload thành công → lưu đáp án
            updateLocalAnswer(question, {
                fileId: uploadedFile.id,
                fileName: file.name,
                filePath: uploadedFile.id,
                mimeType: file.type,
                duration: recordSpeakingSeconds(question),
                questionKey: key
            });

            // Gọi API lưu answer
            saveQuestionAnswer(question, parentQuestionId, false).subscribe({
                next: () => {
                    state.phase = 'uploaded';
                    state.uploadResult = uploadedFile;

                    // Chuyển URL từ local blob → AWS URL
                    if (state.audioUrl) URL.revokeObjectURL(state.audioUrl);
                    state.audioUrl = buildAwsFileUrl(uploadedFile.id);

                    // Nếu vẫn ở parent hiện tại → prepare câu record tiếp theo
                    if (currentParent && questionKey(currentParent) === activeParentKey) {
                        setTimeout(prepareActiveRecordQuestion, 2000);
                    }
                },
                error: () => {
                    if (retryCount < 2) {
                        setTimeout(uploadRecording(..., retryCount+1), 1500);
                        return;
                    }
                    delete localAnswers[key];
                    state.phase = 'error';
                    state.error = 'Lưu đáp án ghi âm thất bại.';
                }
            });
        },
        error: () => {
            if (retryCount < 2) {
                setTimeout(uploadRecording(..., retryCount+1), 1500);
                return;
            }
            state.phase = 'error';
            state.error = 'Upload file ghi âm thất bại.';
        }
    });
}
```

**File upload detail:**
| Item | Giá trị |
|---|---|
| Type tag | `'student_record'` |
| Retry tối đa | 2 lần (retryCount = 0, 1) |
| Delay giữa retry | 1500ms |
| File name format | `record-{questionKey}-{timestamp}.mp3` |
| Bitrate | 128 kbps (khi khởi tạo MicRecorder) |
| Answer payload | `{ fileId, fileName, filePath, mimeType, duration, questionKey }` |

### 3.12 Retry — `retryRecordQuestion(question)`

```typescript
retryRecordQuestion(question) {
    key = questionKey(question);
    state = recordStates[key];

    // Nếu vẫn còn file → upload lại (không cần record lại)
    if (state?.file) {
        state.error = '';
        uploadRecording(question, state.file, ...);
        return;
    }

    // Không còn file → record lại từ đầu
    prepareRecordQuestion(question);
}
```

### 3.13 Khôi phục state khi quay lại câu — `hydrateRecordStateFromAnswer()`

Khi user quay lại câu record đã upload, `recordState()` gọi `hydrateRecordStateFromAnswer()`:

```typescript
hydrateRecordStateFromAnswer(question) {
    key = questionKey(question);
    answer = answerValue(question);

    if (!answer?.fileId && !answer?.fileName && !answer?.filePath) return;

    // Khôi phục state với phase = 'uploaded'
    recordStates[key] = {
        phase: 'uploaded',
        prepareLeft: 0,
        speakingLeft: 0,
        uploadResult: answer
    };
}
```

---

## 4. Các Method Hỗ Trợ

### 4.1 Thời gian

```typescript
// Chuẩn bị: mặc định 0 giây (không có prepare)
recordPrepareSeconds(question): number {
    prepare = Number(question?.params?.prepare);
    return prepare > 0 ? prepare : 0;
}

// Nói: mặc định 30 giây
recordSpeakingSeconds(question): number {
    speaking = Number(question?.params?.time);
    return speaking > 0 ? speaking : 30;
}
```

➡ Nếu `question.params.prepare` không set → mặc định **0s**  
➡ Nếu `question.params.time` không set → mặc định **30s**

### 4.2 Kiểm tra trạng thái

```typescript
// Có đang ghi âm ở bất kỳ câu nào không?
isRecordingInProgress(): boolean {
    return Object.keys(recordStates).some(key =>
        ['preparing', 'recording', 'recorded', 'uploading']
            .includes(recordStates[key]?.phase)
    );
}

// Có upload đang diễn ra không?
hasRecordUploadInProgress(): boolean {
    return Object.keys(recordStates).some(key =>
        ['recorded', 'uploading'].includes(recordStates[key]?.phase)
    );
}
```

### 4.3 Cleanup khi chuyển câu

```typescript
// Dọn dẹp khi chuyển sang câu khác
cleanupActiveRecordQuestion() {
    parent = currentParent;
    if (!parent) return;

    // Clean parent
    cleanupRecordQuestion(parent, parentKey, parentQuestionId);
    // Clean children
    parent.children.filter(isRecordQuestion)
        .forEach(child => cleanupRecordQuestion(child, ...));
}

cleanupRecordQuestion(question, activeParentKey, parentQuestionId) {
    if (!question || !isRecordQuestion(question)) return;

    key = questionKey(question);
    clearRecordTimer(key);

    // Nếu đang prepare → hủy
    if (recordStates[key]?.phase === 'preparing')
        recordStates[key].phase = 'idle';

    // Nếu đang recording → stop + upload
    if (recordStates[key]?.phase === 'recording' && recorders[key])
        stopRecording(question, activeParentKey, parentQuestionId);
}
```

### 4.4 AWS URL

```typescript
buildAwsFileUrl(fileId): string {
    url = new URL(getLinkDownload_aws(fileId.toString()));
    url.searchParams.set('token', auth.accessToken);
    return url.toString();
}
```

### 4.5 Audio error handling

```typescript
// Khi audio player load thất bại
onAudioLoadError(question): void {
    state = recordStates[questionKey(question)];
    if (state) state.audioLoadFailed = true;
}

// Reload audio với cache-busting
reloadAudio(question): void {
    state = recordStates[questionKey(question)];
    if (!state || !state.uploadResult?.id) return;
    state.audioLoadFailed = false;
    state.audioUrl = buildAwsFileUrl(state.uploadResult.id) + '&t=' + Date.now();
    // Thêm timestamp để bypass cache
}
```

---

## 5. HTML Template — Từng dòng

### 5.1 Question block (hiển thị prepare/speaking time)

```html
<!-- Trong template #questionBlock (dòng 168-170) -->
<p *ngIf="isRecordQuestion(question)" class="student-question-params">
    <ng-container *ngIf="recordPrepareSeconds(question) > 0">
        Prepare time: {{ recordPrepareSeconds(question) }}s -
    </ng-container>
    Speaking time: {{ recordSpeakingSeconds(question) }}s
</p>
```

➡ Hiển thị badge tím `#4b3193` trên nền `#f0eef9`  
➡ Nếu Prepare time = 0 → chỉ hiển thị "Speaking time: Xs"  
➡ CSS: `.student-question-params` — `inline-flex; padding: 5px 10px; border-radius: 999px`

### 5.2 Recording box (dòng 235-254)

```html
<!-- Trong template #questionControl -->
<ng-container *ngIf="isRecordQuestion(question) && recordState(question) as state">

    <!-- Chỉ hiển thị khi phase !== 'idle' -->
    <div *ngIf="state.phase !== 'idle'" class="student-record-box">

        <div class="student-record-box__head">
            <!-- Icon microphone: 3 trạng thái -->
            <i class="pi pi-microphone"
               [class.student-record-box__icon--recording]="state.phase === 'recording'"
               [class.student-record-box__icon--speaking]="state.phase === 'recording' && state.isSpeaking">
            </i>

            <div>
                <!-- ==== PREPARING ==== -->
                <strong *ngIf="state.phase === 'preparing' && state.prepareLeft > 0">
                    Prepare to speak
                </strong>
                <span *ngIf="state.phase === 'preparing' && state.prepareLeft > 0">
                    Recording starts in {{ state.prepareLeft }}s
                </span>

                <!-- ==== RECORDING ==== -->
                <strong *ngIf="state.phase === 'recording'">
                    Recording
                </strong>
                <span *ngIf="state.phase === 'recording'">
                    Speaking time left: {{ state.speakingLeft }}s
                </span>
                <button *ngIf="canSubmitRecordEarly(question)"
                        type="button" class="nav-button"
                        (click)="submitRecordEarly(question)">
                    Submit answer
                </button>

                <!-- ==== RECORDED ==== -->
                <strong *ngIf="state.phase === 'recorded'">
                    Uploading...
                </strong>

                <!-- ==== UPLOADING ==== -->
                <strong *ngIf="state.phase === 'uploading'">
                    Uploading...
                </strong>

                <!-- ==== UPLOADED ==== -->
                <span *ngIf="state.phase === 'uploaded'"
                      class="badge-light-base badge-success-light">
                    <div style="display: flex; align-items: center;">
                        <i class="pi pi-check"></i> Submit success
                    </div>
                </span>

                <!-- ==== ERROR ==== -->
                <strong *ngIf="state.phase === 'error'">Upload failed</strong>
                <span *ngIf="state.phase === 'error'"
                      class="student-record-box__error-text">
                    {{ state.error }}
                </span>
                <button *ngIf="state.phase === 'error'"
                        type="button"
                        class="nav-button student-record-box__retry-btn"
                        (click)="retryRecordQuestion(question)">
                    <i class="pi pi-refresh"></i> Upload lại
                </button>
            </div>
        </div>
    </div>
</ng-container>
```

**Tổng kết các phase và UI tương ứng:**

| Phase | Icon color | Status text | Time text | Nút |
|---|---|---|---|---|
| `preparing` | Tím (default) | "Prepare to speak" | "Recording starts in Xs" | — |
| `recording` | Đỏ (`--recording`) | "Recording" | "Speaking time left: Xs" | "Submit answer" (nếu nói ≥20s) |
| `recording + isSpeaking=true` | Xanh + pulse (`--speaking`) | "Recording" | "Speaking time left: Xs" | "Submit answer" |
| `recorded` | — | "Uploading..." | — | — |
| `uploading` | — | "Uploading..." | — | — |
| `uploaded` | — | Badge xanh "Submit success" | — | — |
| `error` | — | "Upload failed" | — | "Upload lại" (retry) |

---

## 6. CSS — Từng selector cho Recording

### 6.1 Container

```css
.student-record-box {
    display: grid;
    gap: 12px;
    margin-top: 10px;
    padding: 14px;
    border: 1px solid #d8d8de;
    border-radius: 6px;
    background: #ffffff;
}
```

### 6.2 Header (icon + text)

```css
.student-record-box__head {
    display: flex;
    align-items: center;
    gap: 12px;
}

.student-record-box__head div {
    display: grid;
    gap: 4px;
    min-width: 0;
}

.student-record-box__head strong {
    color: #111827;
    font-size: 14px;
    font-weight: 800;
}

.student-record-box__head span {
    color: #4b5563;
    font-size: 14px;
    font-weight: 600;
}
```

### 6.3 Icon microphone — 3 trạng thái

```css
/* DEFAULT: Tím */
.student-record-box__head i {
    display: grid;
    width: 42px;
    height: 42px;
    place-items: center;
    border-radius: 50%;
    color: #4b3193;
    background: #f0eef9;
    font-size: 18px;
}

/* RECORDING: Đỏ */
.student-record-box__icon--recording {
    color: #dc2626 !important;
    background: #fee2e2 !important;
}

/* SPEAKING: Xanh + glow + pulse animation */
.student-record-box__icon--speaking {
    color: #ffffff !important;
    background: #16a34a !important;
    box-shadow: 0 0 0 8px rgba(22, 163, 74, .16);
    animation: student-record-speaking-pulse .65s ease-in-out infinite alternate;
}

/* PULSE ANIMATION */
@keyframes student-record-speaking-pulse {
    from { transform: scale(1); }
    to   { transform: scale(1.08); }
}
```

### 6.4 Success badge

```css
.badge-light-base {
    padding: 6px 12px;
    border-radius: 4px;
    font-weight: 500;
    font-size: 13px !important;
    display: inline-flex;
    align-items: center;
    gap: 6px;
}

.badge-success-light {
    background: #22C03C1A;  /* 10% opacity */
    color: #22C03C !important;
}

.badge-success-light i {
    color: #22C03C !important;
    font-size: 13px !important;
    width: auto !important;
    height: auto !important;
    border-radius: 0 !important;
    background: transparent !important;
}
```

### 6.5 Error text & retry button

```css
/* Error message */
.student-record-box__error-text {
    color: #dc2626;
    font-size: 13px;
    font-weight: 600;
}

/* Retry button */
.student-record-box__retry-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 6px 14px;
    border: 1px solid #dc2626;
    border-radius: 6px;
    background: #ffffff;
    color: #dc2626;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
}

.student-record-box__retry-btn:hover {
    background: #fef2f2;
}

.student-record-box__retry-btn i {
    /* Reset icon styles */
    width: auto !important;
    height: auto !important;
    border-radius: 0 !important;
    background: transparent !important;
    color: #dc2626 !important;
    font-size: 13px !important;
}
```

### 6.6 Audio player & reload button

```css
.student-record-box__audio {
    flex: 1 1 auto;
    min-width: 0;
}

.student-record-box__reload-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    width: 32px;
    height: 32px;
    border: 1px solid #d1d5db;
    border-radius: 50%;
    background: #ffffff;
    color: #6b7280;
    cursor: pointer;
    transition: color 0.15s ease, border-color 0.15s ease;
}

.student-record-box__reload-btn:hover {
    color: #1f4f8f;
    border-color: #1f4f8f;
}

.student-record-box__reload-btn i {
    font-size: 14px;
}
```

### 6.7 Badge params (prepare/speaking time)

```css
.student-question-params {
    display: inline-flex;
    margin: 8px 0 0;
    padding: 5px 10px;
    border-radius: 999px;
    color: #4b3193;
    background: #f0eef9;
    font-size: 14px;
    font-weight: 700;
}
```

### 6.8 Placeholder (khi chưa có recording)

```css
.student-record-placeholder {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    margin-top: 10px;
    padding: 9px 10px;
    border-radius: 5px;
    color: #4b3193;
    background: #f0eef9;
    font-size: 14px;
    font-weight: 700;
}
```

---

## 7. Private Fields Liên Quan đến Recording

| Field | Kiểu | Mục đích |
|---|---|---|
| `recordStates` | `{ [key: string]: RecordQuestionState }` | State machine cho từng câu record |
| `private recordTimers` | `{ [key: string]: any }` | `setInterval` IDs cho prepare/speaking countdown |
| `private recorders` | `{ [key: string]: any }` | `MicRecorder` instances (mỗi câu một recorder riêng) |
| `private recordAudioContexts` | `{ [key: string]: AudioContext }` | `AudioContext` cho speaking indicator |
| `private recordAudioStreams` | `{ [key: string]: MediaStream }` | `MediaStream` từ microphone |
| `private recordAudioAnimationFrames` | `{ [key: string]: number }` | `requestAnimationFrame` IDs cho vòng lặp detect speaking |
| `private lastBeepTime` | `number` | `Date.now()` lần cuối phát beep |
| `private beepAudioUrl` | `string` | Cached blob URL của beep sound WAV |

---

## 8. Lifecycle & Cleanup

### 8.1 `ngOnDestroy` — Dọn dẹp

```typescript
ngOnDestroy(): void {
    // Dừng tất cả speaking indicators
    Object.keys(this.recordAudioAnimationFrames)
        .forEach(key => this.stopSpeakingIndicator(key));

    // Clear tất cả record timers
    Object.keys(this.recordTimers)
        .forEach(key => this.clearRecordTimer(key));

    // Stop recorder nếu đang recording
    Object.keys(this.recorders).forEach(key => {
        if (this.recordStates[key]?.phase === 'recording') {
            this.recorders[key].stop().getMp3().catch(() => null);
        }
    });

    // Revoke tất cả audio URLs
    Object.keys(this.recordStates).forEach(key => {
        if (this.recordStates[key].audioUrl) {
            URL.revokeObjectURL(this.recordStates[key].audioUrl);
        }
    });
}
```

### 8.2 Tổng kết các điểm gọi

| Hành động | Method gọi | Thời điểm |
|---|---|---|
| Mở recording tự động | `prepareActiveRecordQuestion()` | Khi vào trang, khi chuyển câu |
| Chọn câu nào mở | `activeRecordQuestion()` | Trong `prepareActiveRecordQuestion()` |
| Prepare countdown | `startPrepareCountdown()` | Nếu `prepareTime > 0` |
| Beep + bắt đầu ghi | `playBeepAndStartRecording()` → `startRecording()` | Hết prepare hoặc ngay lập tức |
| Detect giọng nói | `startSpeakingIndicator()` | Khi MicRecorder.start() thành công |
| Đếm ngược thời gian | `startSpeakingCountdown()` | Khi MicRecorder.start() thành công |
| Submit sớm | `submitRecordEarly()` | User bấm nút (nếu ≥20s) |
| Dừng ghi tự động | `stopRecording()` | Hết speaking time |
| Upload | `uploadRecording()` | Sau stop |
| Retry | `retryRecordQuestion()` | User bấm "Upload lại" |
| Dọn khi chuyển câu | `cleanupActiveRecordQuestion()` | Trong `setActiveParent()` |
| Dọn khi destroy | `ngOnDestroy()` | Rời component |

---

## 9. Sequence Diagram — Luồng đầy đủ

```
[ENTER SKILL]
  │
  ├── loadQuestionTest()
  │     └── prepareActiveRecordQuestion()
  │           └── activeRecordQuestion() → tìm câu record
  │                 └── prepareRecordQuestion(question)
  │                       └── recordStates[key] = { phase:'preparing', ... }
  │                              │
  │                     prepareTime > 0 ?
  │                       ├─ YES: startPrepareCountdown()
  │                       │        setInterval 1s
  │                       │        prepareLeft-- → 0
  │                       │        → playBeepAndStartRecording()
  │                       └─ NO:  → playBeepAndStartRecording()
  │                                    │
  │                     [BEEP] 880Hz 0.2s
  │                     [DELAY 200ms]
  │                                    │
  │                     MicRecorder.start()
  │                       ├─ startSpeakingIndicator()
  │                       │     getUserMedia → AnalyserNode → loop
  │                       └─ startSpeakingCountdown()
  │                             setInterval 1s
  │
  │                     ┌─────────────────────────────────┐
  │                     │  USER ĐANG NÓI                  │
  │                     │  Icon xanh + pulse animation    │
  │                     │  speakingLeft-- mỗi giây        │
  │                     └─────────────────────────────────┘
  │                              │
  │              ┌───────────────┴───────────────┐
  │              │                               │
  │    speakingLeft = 0                  User bấm "Submit answer"
  │              │                     (nếu speakingTime - left ≥ 20)
  │              └───────────────┬───────────────┘
  │                              │
  │              stopRecording()
  │                ├─ stopSpeakingIndicator() → cancelAnimationFrame
  │                ├─ recorder.stop().getMp3()
  │                └─ uploadRecording()
  │                      ├─ state.phase = 'uploading'
  │                      ├─ fileService.uploadFileAwsWidthProgress()
  │                      ├─ updateLocalAnswer({ fileId, ... })
  │                      ├─ saveQuestionAnswer() → API
  │                      └─ state.phase = 'uploaded'
  │                             │
  │                    [Nếu còn câu record tiếp theo]
  │                    setTimeout(prepareActiveRecordQuestion, 2000)
  │
[CHUYỂN CÂU]
  ├── setActiveParent()
  │     ├── saveCurrentQuestionAnswers()
  │     └── cleanupActiveRecordQuestion()
  │           ├── clearRecordTimer(key)
  │           ├── Nếu phase='preparing' → phase='idle'
  │           └── Nếu phase='recording' → stopRecording()
  │
[DESTROY]
  └── ngOnDestroy()
        ├── stopSpeakingIndicator(all)
        ├── clearRecordTimer(all)
        ├── stop recorders
        └── revokeObjectURL(all audioUrls)
```

---

## 10. Phụ thuộc (Dependencies cần có)

```json
{
    "dependencies": {
        "mic-recorder-to-mp3": "^2.2.0"
    }
}
```

**Import:**
```typescript
import * as MicRecorder from 'mic-recorder-to-mp3';
// Sử dụng:
// const recorder = new MicRecorder({ bitRate: 128 });
// recorder.start().then(() => { ... });
// recorder.stop().getMp3().then(([buffer, blob]) => { ... });
```

**Browser API sử dụng:**
| API | Mục đích |
|---|---|
| `navigator.mediaDevices.getUserMedia({ audio: true })` | Xin quyền truy cập microphone |
| `AudioContext` (hoặc `webkitAudioContext`) | Xử lý audio |
| `AnalyserNode` (fftSize=256) | Phân tích tần số realtime |
| `getByteFrequencyData()` | Lấy dữ liệu tần số |
| `requestAnimationFrame` | Vòng lặp detect speaking |
| `URL.createObjectURL(blob)` | Tạo local URL cho audio preview |
| `URL.revokeObjectURL(url)` | Giải phóng bộ nhớ |

---

*Tài liệu này mô tả chi tiết từng dòng code của cơ chế Recording/Speaking trong module `lam-bai-theo-ky-nang`. Đủ để tái tạo y nguyên.*
