interface Props {
  entryId: string;
  isWaitlist: boolean;
  onRestart: () => void;
}

export function Complete({ entryId, isWaitlist, onRestart }: Props) {
  return (
    <div className="complete">
      <div className={`complete-icon${isWaitlist ? ' waitlist' : ''}`}>
        {isWaitlist ? '!' : '✓'}
      </div>
      <h2 className="complete-title">
        {isWaitlist ? 'キャンセル待ちで受け付けました' : 'エントリーが完了しました'}
      </h2>
      <p className="complete-message">
        {isWaitlist ? (
          <>
            現在この大会は出場枠が埋まっているため、<br />
            <strong>キャンセル待ち</strong>での受付となります。<br />
            出場枠に空きが出た場合、LINEにてご連絡いたします。
          </>
        ) : (
          <>
            エントリーありがとうございます。<br />
            LINEに申込控えをお送りしましたのでご確認ください。
          </>
        )}
      </p>
      <p className="complete-id">受付番号: {entryId.slice(0, 8).toUpperCase()}</p>
      <p className="complete-note">
        キャンセルの場合はLINEよりご連絡ください。
      </p>
      <p className="demo-note">
        ※ こちらはデモです。実際のエントリーは登録されません。
      </p>
      <button className="btn-back" onClick={onRestart}>最初の画面に戻る</button>
    </div>
  );
}
