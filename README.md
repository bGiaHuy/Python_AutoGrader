================================================================================
                           FPT PE PYTHON AUTOGRADER
================================================================================

# GIỚI THIỆU
FPT PE Python AutoGrader là một ứng dụng web nội bộ (Local Web App) được thiết
kế đặc biệt để chấm điểm tự động các bài thực hành lập trình Python của trường Đại học FPT. 

Ứng dụng cung cấp một giao diện web Dark-Mode hiện đại, cho phép bạn chọn một
thư mục chứa mã nguồn (.py) và các file test case, sau đó tự động chạy, kiểm 
tra và trả về kết quả chính xác (Pass/Fail) cũng như hiển thị so sánh chi tiết.

# TÍNH NĂNG NỔI BẬT
- Tự động nhận diện thư mục: Chọn thư mục bài làm, phần mềm sẽ tự ghép cặp các
  file Input và Output tương ứng.
- Hoạt động mượt mà với I/O tiêu chuẩn: Ứng dụng mô phỏng việc nhập từ bàn phím 
  (stdin) và thu thập kết quả hiển thị trên màn hình (stdout).
- Hỗ trợ file dữ liệu ngoài: Tự động mang theo các file dữ liệu (.txt, .csv)
  cần thiết để code có thể đọc.
- Giao diện trực quan: Xem ngay lỗi code (nếu có), thời gian chạy, và kết quả 
  đối chiếu Output dễ hiểu.

# CÀI ĐẶT
1. Đảm bảo máy tính của bạn đã cài đặt Python.
2. Cài đặt thư viện Flask (framework web) bằng cách chạy lệnh sau trong Terminal/PowerShell:
   pip install Flask

# CÁCH SỬ DỤNG
1. Khởi động server bằng cách di chuyển vào thư mục chứa ứng dụng và chạy:
   python app.py
2. Mở trình duyệt web của bạn và truy cập: http://127.0.0.1:5000
3. Trên giao diện, chọn "📁 Select Folder" và điều hướng đến thư mục bài làm.
   (Thư mục cần chứa ít nhất 1 file .py, và các cặp file Input/Output).
4. Nhấn "⚡ Grade All Test Cases" để chấm điểm tự động.

# CẤU TRÚC THƯ MỤC CHUẨN
Để hệ thống có thể nhận diện test case, thư mục bài làm nên có cấu trúc sau:
  Ten_Thu_Muc/
  ├── Code_Bai_Lam.py    (File code Python)
  ├── 1_inp.txt          (File input 1, tên phải có chữ "inp")
  ├── 1_out.txt          (File expected output 1, tên phải có chữ "out")
  ├── 2_inp.txt          (File input 2)
  ├── 2_out.txt          (File expected output 2)
  └── data.txt           (File dữ liệu - nếu code yêu cầu đọc file)

# SINH TEST CASE BẰNG AI
Nếu bạn muốn dùng ChatGPT, Claude, hay Gemini để tạo thêm test case cho đề bài, 
hãy tham khảo file "prompt_guide.txt". File đó chứa các hướng dẫn chi tiết và 
mẫu Prompt (câu lệnh) chuẩn nhất để yêu cầu AI tạo ra test case tương thích 
100% với hệ thống chấm điểm này.

================================================================================
