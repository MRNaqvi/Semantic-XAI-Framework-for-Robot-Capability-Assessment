public class TripleComparer : IEqualityComparer<Triple>
{
    public bool Equals(Triple? x, Triple? y)
    {
        if (x == null || y == null)
        {
            return false;
        }
        
        return x.Subject == y.Subject &&
               x.Predicate == y.Predicate &&
               x.Object == y.Object;
    }

    public int GetHashCode(Triple obj)
    {
        if (obj == null)
        {
            throw new ArgumentNullException(nameof(obj));
        }

        int hashSubject = obj.Subject == null ? 0 : obj.Subject.GetHashCode();
        int hashPredicate = obj.Predicate == null ? 0 : obj.Predicate.GetHashCode();
        int hashObject = obj.Object == null ? 0 : obj.Object.GetHashCode();

        return hashSubject ^ hashPredicate ^ hashObject;
    }
}
