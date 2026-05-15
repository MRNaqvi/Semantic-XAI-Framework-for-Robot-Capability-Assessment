import importlib.util

REQUIRED_PACKAGES = ["flask", "tensorflow", "lime"]

missing = [
    package for package in REQUIRED_PACKAGES
    if importlib.util.find_spec(package) is None
]

print(",".join(missing))
