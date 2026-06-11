// キャンセル待ち予約になる場合の警告バナー
export function WaitlistBanner() {
  return (
    <div className="waitlist-banner">
      <span className="waitlist-banner-icon">⚠️</span>
      <div>
        <p className="waitlist-banner-title">キャンセル待ちでの予約となります</p>
        <p className="waitlist-banner-text">
          この大会は出場枠が埋まっています。キャンセルが出て出場枠に空きができた場合、
          LINEにてご連絡いたします。
        </p>
      </div>
    </div>
  );
}
