export function validateGeneratedTopic(value: string): string {
  const topic = value.trim();
  if (Array.from(topic).length > 20 || !/^[가-힣]+(?: [가-힣]+)*$/u.test(topic)) {
    throw new Error('AI returned an invalid topic');
  }
  return topic;
}