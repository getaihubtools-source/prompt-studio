/* تنظیمات لایسنس Prompt Studio — بدون نیاز به بیلد، با ویرایش همین فایل.

   api       آدرس Worker مشترک AIhub (همان که در پولینو و دوقاب استفاده می‌شود)
   product   شناسهٔ محصول در Worker (باید با PRODUCTS در Worker یکی باشد)
   publicKey کلید عمومی امضای توکن‌ها؛ همان که در دوقاب هم هست (محرمانه نیست)
   mode      "free"   = نسخهٔ رایگان تا ۱۵ پرامپت + قفل چند قابلیت، با کد Pro باز می‌شود
             "locked" = بدون کد فعال‌سازی فقط صفحهٔ فعال‌سازی نمایش داده می‌شود (مثل دوقاب) */
window.PS_LICENSE = {
  api: "https://aihub-license.get-aihubtools.workers.dev",
  product: "prompt-studio",
  publicKey: { "kty": "EC", "crv": "P-256", "x": "oaMsNWVXFBV3s7IW55TXXWc8b2fUkG6x-CQOunje2fM", "y": "CpMhKno5HTtkUg7r9kykintWA_g-9E8xavFNyGJycDg" },
  mode: "free"
};
