import asyncio
import time
from problem_db import db
from problem_fetcher import fetcher

async def fetch_and_store_by_difficulty(diff_name: str, start_skip: int = 0, target_count: int = 400):
    print(f"\n==========================================")
    print(f"Fetching up to {target_count} {diff_name} problems from LeetCode (skip={start_skip})...")
    print(f"==========================================")

    total_added = 0
    skip = start_skip
    batch_size = 100

    while total_added < target_count:
        needed = min(batch_size, target_count - total_added)
        filters = {"difficulty": diff_name.upper()}

        print(f"Fetching batch skip={skip}, limit={needed} for {diff_name}...")
        res = await fetcher.fetch_batch_async(skip=skip, limit=needed, filters=filters)
        questions = res.get("questions", [])
        total_available = res.get("total", 0)

        if not questions:
            print(f"No more questions returned for {diff_name}.")
            break

        count = db.upsert_problems_batch(questions)
        total_added += count
        skip += len(questions)
        print(f"-> Upserted {count} {diff_name} problems (Total in run: {total_added}/{target_count}, LC available: {total_available})")

        if skip >= total_available:
            break

        await asyncio.sleep(0.3)

    return total_added


async def main():
    print("Pre-sync Database Stats:")
    initial_stats = db.get_stats()
    print(f"Total: {initial_stats['total_problems']} | Easy: {initial_stats['easy_count']} | Medium: {initial_stats['medium_count']} | Hard: {initial_stats['hard_count']}")

    # Fetch 400 Medium problems (starting at skip=400 to get new ones)
    added_medium = await fetch_and_store_by_difficulty("MEDIUM", start_skip=400, target_count=400)

    # Fetch 300 Hard problems (starting at skip=500 to get new ones)
    added_hard = await fetch_and_store_by_difficulty("HARD", start_skip=500, target_count=300)

    print("\n==========================================")
    print("Sync Complete!")
    print("==========================================")
    final_stats = db.get_stats()
    print(f"Total Problems Now: {final_stats['total_problems']}")
    print(f"  Easy:   {final_stats['easy_count']}")
    print(f"  Medium: {final_stats['medium_count']} (+{added_medium})")
    print(f"  Hard:   {final_stats['hard_count']} (+{added_hard})")
    print(f"  Free:   {final_stats['free_count']} | Paid: {final_stats['paid_count']}")
    print(f"  Total Topic Tags: {final_stats['total_tags']}")
    print("Top Tags:", [t['tag'] for t in final_stats['top_tags'][:10]])


if __name__ == "__main__":
    asyncio.run(main())
