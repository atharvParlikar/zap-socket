export function OutgoingMessage({ msg }: { msg: string }) {
  return (
    <div className="flex justify-end">
      <div className="bg-blue-500 text-white p-3 rounded-lg max-w-[75%]">
        {msg}
      </div>
    </div>
  );
}
