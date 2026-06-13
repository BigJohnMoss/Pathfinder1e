import argparse


def main():
    parser = argparse.ArgumentParser(description="Pathfinder1e CLI")
    parser.add_argument("--name", "-n", default="Player", help="Name to greet")
    args = parser.parse_args()
    print(f"Hello, {args.name} from Pathfinder1e!")


if __name__ == "__main__":
    main()
